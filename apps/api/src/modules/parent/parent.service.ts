import { AttemptStatus, EmailVerificationPurpose, TaskStatus, VerificationAccountRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

import { prisma } from '../../database/prisma.js';
import { sendOtpEmail } from '../../shared/email/email.service.js';
import { AppError } from '../../shared/http/app-error.js';
import { getAttemptDetail as getContentAttemptDetail } from '../content/content.service.js';
import { getAttemptAnalysis as getMockAttemptAnalysis, getAttemptSwotAnalysis, getCategoryAnalytics, listBookmarkedQuestions, listExamTypes, listExams, listMockExamTypes } from '../mock/mock.service.js';
import { testAttemptAnalysis as getBatchAttemptAnalysis } from '../mentorship/mentorship.service.js';
import { attemptDetail as getRcAttemptDetail, attempts as getRcAttempts, dashboard as getRcDashboard, testDetail as getRcTestDetail, tests as getRcTests } from '../rc/rc.service.js';
import { getNotifications as getStudentNotifications } from '../student/student.service.js';
import type { ChangePasswordInput, UpdateParentProfileInput } from './parent.schemas.js';

const submitted = [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED];
const isSubmitted = (status: AttemptStatus) => status === AttemptStatus.SUBMITTED || status === AttemptStatus.AUTO_SUBMITTED;
const n = (value: { toNumber(): number } | number | null | undefined) => value == null ? 0 : typeof value === 'number' ? value : value.toNumber();

const parentProfileSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  emailVerified: true,
  phoneNumber: true,
  occupation: true,
  createdAt: true,
} as const;

export const getParentProfile = async (parentId: string) => {
  const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: parentProfileSelect });
  if (!parent) throw new AppError(404, 'Parent account not found.');
  return parent;
};

export const updateParentProfile = async (parentId: string, input: UpdateParentProfileInput) => {
  try {
    return await prisma.parent.update({ where: { id: parentId }, data: input, select: parentProfileSelect });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') throw new AppError(409, 'That phone number is already in use.');
    throw error;
  }
};

const requireLinkedStudent = async (parentId: string, studentId: string) => {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    include: { student: { select: { id: true, name: true, username: true, profileImage: true, className: true, schoolName: true, city: true, state: true } } },
  });
  if (!link) throw new AppError(403, 'This student is not linked to your parent account.');
  return link;
};

const studentCards = async (parentId: string) => {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    orderBy: { createdAt: 'desc' },
    include: { student: { select: { id: true, name: true, username: true, profileImage: true, className: true, schoolName: true, city: true, state: true } } },
  });

  return Promise.all(links.map(async (link) => {
    const [mockAttempts, rcAttempts, contentCompleted, batchAccesses, activeSessions] = await Promise.all([
      prisma.mockAttempt.count({ where: { studentId: link.studentId, status: { in: submitted } } }),
      prisma.rcAttempt.count({ where: { studentId: link.studentId, submittedAt: { not: null } } }),
      prisma.studentContentCompletion.count({ where: { studentId: link.studentId } }),
      prisma.studentBatchAccess.count({ where: { studentId: link.studentId, isActive: true, expiryDate: { gte: new Date() } } }),
      prisma.liveSession.count({
        where: {
          startDatetime: { lte: new Date() },
          endDatetime: { gte: new Date() },
          mentorshipBatch: { studentAccesses: { some: { studentId: link.studentId, isActive: true, expiryDate: { gte: new Date() } } } },
        },
      }),
    ]);
    return {
      relationship: link.relationship,
      linkedAt: link.createdAt,
      student: link.student,
      metrics: { mockAttempts, rcAttempts, contentCompleted, activeBatches: batchAccesses, activeSessions },
    };
  }));
};

export const dashboard = async (parentId: string) => {
  const [parent, students] = await Promise.all([getParentProfile(parentId), studentCards(parentId)]);
  return { parent, students };
};

export const studentOverview = async (parentId: string, studentId: string) => {
  const link = await requireLinkedStudent(parentId, studentId);
  const [latestMocks, latestRc, latestContentTests, activeBatches, contentTotal, contentCompleted] = await Promise.all([
    prisma.mockAttempt.findMany({
      where: { studentId, status: { in: submitted } },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      include: { mockExam: { select: { name: true, examType: { select: { name: true } }, mockExamType: { select: { name: true } } } } },
    }),
    prisma.rcAttempt.findMany({ where: { studentId, submittedAt: { not: null } }, orderBy: { submittedAt: 'desc' }, take: 3, include: { rcTest: { select: { title: true } } } }),
    prisma.contentAttempt.findMany({ where: { studentId, status: { in: submitted } }, orderBy: { submittedAt: 'desc' }, take: 3, include: { contentTest: { select: { name: true, topic: { select: { name: true } } } } } }),
    prisma.studentBatchAccess.findMany({ where: { studentId, isActive: true, expiryDate: { gte: new Date() } }, take: 4, include: { mentorshipBatch: { include: { mentorshipProgram: { select: { id: true, name: true } } } } } }),
    prisma.content.count({ where: { isActive: true } }),
    prisma.studentContentCompletion.count({ where: { studentId } }),
  ]);

  return {
    student: link.student,
    relationship: link.relationship,
    metrics: {
      mockAttempts: latestMocks.length,
      rcAttempts: latestRc.length,
      contentCompletionPercent: contentTotal ? Math.round((contentCompleted / contentTotal) * 100) : 0,
      activeBatches: activeBatches.length,
    },
    latestMocks: latestMocks.map((attempt) => summarizeScore(attempt, attempt.mockExam.name)),
    latestRc: latestRc.map((attempt) => summarizeScore(attempt, attempt.rcTest.title)),
    latestContentTests: latestContentTests.map((attempt) => summarizeScore(attempt, attempt.contentTest.name)),
    activeBatches: activeBatches.map((access) => ({
      id: access.mentorshipBatch.id,
      name: access.mentorshipBatch.name,
      description: access.mentorshipBatch.description,
      program: access.mentorshipBatch.mentorshipProgram,
      expiryDate: access.expiryDate,
    })),
  };
};

const summarizeScore = (attempt: { id: string; marksScored: unknown; totalMarks: unknown; accuracy: unknown; submittedAt?: Date | null }, title: string) => ({
  id: attempt.id,
  title,
  score: n(attempt.marksScored as any),
  totalMarks: n(attempt.totalMarks as any),
  accuracy: n(attempt.accuracy as any),
  submittedAt: attempt.submittedAt ?? null,
});

export const mockAttempts = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  const attempts = await prisma.mockAttempt.findMany({
    where: { studentId, status: { in: submitted } },
    orderBy: { submittedAt: 'desc' },
    include: { mockExam: { include: { examType: { select: { name: true } }, mockExamType: { select: { name: true } }, difficulty: { select: { name: true } } } } },
  });
  return attempts.map((attempt) => ({
    ...summarizeScore(attempt, attempt.mockExam.name),
    rank: attempt.rank,
    percentile: attempt.percentile == null ? null : n(attempt.percentile),
    timeTakenSeconds: attempt.timeTakenSeconds,
    correctAnswers: attempt.correctAnswers,
    incorrectAnswers: attempt.incorrectAnswers,
    unattemptedAnswers: attempt.unattemptedAnswers,
    examType: attempt.mockExam.examType.name,
    mockType: attempt.mockExam.mockExamType.name,
    difficulty: attempt.mockExam.difficulty.name,
  }));
};

export const mockExamTypes = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return listExamTypes();
};

export const mockCategories = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return listMockExamTypes();
};

export const mockExams = async (parentId: string, studentId: string, examTypeId: string, mockExamTypeId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return listExams(studentId, examTypeId, mockExamTypeId);
};

export const mockCategoryAnalytics = async (parentId: string, studentId: string, examTypeId: string, mockExamTypeId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getCategoryAnalytics(studentId, examTypeId, mockExamTypeId);
};

export const mockBookmarks = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return listBookmarkedQuestions(studentId);
};

export const mockAttemptDetail = async (parentId: string, studentId: string, attemptId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getMockAttemptAnalysis(studentId, attemptId);
};

export const mockAttemptSwot = async (parentId: string, studentId: string, attemptId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getAttemptSwotAnalysis(studentId, attemptId);
};

export const rcSummary = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  const [attempts, leaderboard] = await Promise.all([
    prisma.rcAttempt.findMany({
      where: { studentId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      include: { rcTest: { include: { analytics: true, difficulty: { select: { name: true } } } } },
    }),
    prisma.rcLeaderboard.findUnique({ where: { studentId } }),
  ]);
  return {
    leaderboard: leaderboard ? {
      currentStreak: leaderboard.currentStreak,
      highestStreak: leaderboard.highestStreak,
      totalRcAttempted: leaderboard.totalRcAttempted,
      averageScore: n(leaderboard.averageScore),
      lastCompletedAt: leaderboard.lastCompletedAt,
    } : null,
    attempts: attempts.map((attempt) => ({
      ...summarizeScore(attempt, attempt.rcTest.title),
      timeTakenSeconds: attempt.timeTakenSeconds,
      correctAnswers: attempt.correctAnswers,
      incorrectAnswers: attempt.incorrectAnswers,
      unattemptedAnswers: attempt.unattemptedAnswers,
      difficulty: attempt.rcTest.difficulty.name,
      testAverageScore: n(attempt.rcTest.analytics?.averageScore),
    })),
  };
};

export const rcDashboard = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getRcDashboard(studentId);
};

export const rcTests = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getRcTests(studentId);
};

export const rcTestDetail = async (parentId: string, studentId: string, testId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getRcTestDetail(studentId, testId);
};

export const rcAttempts = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getRcAttempts(studentId);
};

export const rcAttemptDetail = async (parentId: string, studentId: string, attemptId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getRcAttemptDetail(studentId, attemptId);
};

export const childNotifications = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getStudentNotifications(studentId);
};

export const contentProgress = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  const [subjects, attempts] = await Promise.all([
    prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        topics: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            contentTests: { where: { isActive: true }, include: { attempts: { where: { studentId, status: { in: submitted } }, select: { id: true } } } },
            subtopics: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                contents: { where: { isActive: true }, include: { completions: { where: { studentId }, select: { completedAt: true } } }, orderBy: { sequenceNumber: 'asc' } },
              },
            },
          },
        },
      },
    }),
    prisma.contentAttempt.findMany({
      where: { studentId, status: { in: submitted } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: { contentTest: { include: { topic: { include: { subject: { select: { name: true } } } } } } },
    }),
  ]);

  return {
    subjects: subjects.map((subject) => {
      const topics = subject.topics.map((topic) => {
        const subtopics = topic.subtopics.map((subtopic) => ({
          id: subtopic.id,
          name: subtopic.name,
          totalContent: subtopic.contents.length,
          completedContent: subtopic.contents.filter((content) => content.completions.length).length,
          contents: subtopic.contents.map((content) => ({ id: content.id, title: content.title, contentType: content.contentType, completedAt: content.completions[0]?.completedAt ?? null })),
        }));
        const total = subtopics.reduce((sum, item) => sum + item.totalContent, 0);
        const completed = subtopics.reduce((sum, item) => sum + item.completedContent, 0);
        return {
          id: topic.id,
          name: topic.name,
          totalContent: total,
          completedContent: completed,
          completionPercent: total ? Math.round((completed / total) * 100) : 0,
          tests: topic.contentTests.map((test) => ({ id: test.id, name: test.name, attempted: test.attempts.length > 0 })),
          subtopics,
        };
      });
      const total = topics.reduce((sum, item) => sum + item.totalContent, 0);
      const completed = topics.reduce((sum, item) => sum + item.completedContent, 0);
      return { id: subject.id, name: subject.name, description: subject.description, totalContent: total, completedContent: completed, completionPercent: total ? Math.round((completed / total) * 100) : 0, topics };
    }),
    attempts: attempts.map((attempt) => ({
      ...summarizeScore(attempt, attempt.contentTest.name),
      topic: attempt.contentTest.topic.name,
      subject: attempt.contentTest.topic.subject.name,
    })),
  };
};

export const contentAttemptDetail = async (parentId: string, studentId: string, attemptId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getContentAttemptDetail(studentId, attemptId);
};

export const mentorshipPrograms = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return prisma.mentorshipProgram.findMany({
    where: { isActive: true, batches: { some: { studentAccesses: { some: { studentId, isActive: true, expiryDate: { gte: new Date() } } } } } },
    orderBy: { name: 'asc' },
    include: { _count: { select: { batches: { where: { studentAccesses: { some: { studentId, isActive: true, expiryDate: { gte: new Date() } } } } } } } },
  });
};

export const mentorshipBatches = async (parentId: string, studentId: string, programId: string) => {
  await requireLinkedStudent(parentId, studentId);
  const now = new Date();
  return prisma.mentorshipBatch.findMany({
    where: { mentorshipProgramId: programId, isActive: true, studentAccesses: { some: { studentId, isActive: true, expiryDate: { gte: now } } } },
    orderBy: { name: 'asc' },
    include: {
      mentorAssignments: { where: { isActive: true }, include: { mentor: { select: { name: true, qualification: true } } } },
      _count: {
        select: {
          tasks: { where: { startDatetime: { lte: now }, endDatetime: { gte: now } } },
          liveSessions: { where: { startDatetime: { lte: now }, endDatetime: { gte: now } } },
          tests: { where: { isActive: true, startDatetime: { lte: now }, endDatetime: { gte: now } } },
        },
      },
    },
  });
};

export const mentorshipBatch = async (parentId: string, studentId: string, batchId: string) => {
  await requireLinkedStudent(parentId, studentId);
  const now = new Date();
  const batch = await prisma.mentorshipBatch.findFirst({
    where: { id: batchId, isActive: true, studentAccesses: { some: { studentId, isActive: true, expiryDate: { gte: now } } } },
    include: {
      mentorshipProgram: { select: { id: true, name: true } },
      mentorAssignments: { where: { isActive: true }, include: { mentor: { select: { name: true, qualification: true } } } },
      tasks: { orderBy: { endDatetime: 'asc' }, take: 8, include: { completions: { where: { studentId } } } },
      liveSessions: { orderBy: { startDatetime: 'asc' }, take: 8, include: { attendance: { where: { studentId } } } },
      notices: { orderBy: { createdAt: 'desc' }, take: 5 },
      tests: { where: { isActive: true }, orderBy: { startDatetime: 'desc' }, take: 8, include: { attempts: { where: { studentId }, take: 1, orderBy: { createdAt: 'desc' } }, _count: { select: { sections: true } } } },
    },
  });
  if (!batch) throw new AppError(404, 'Mentorship batch not found for this student.');
  return {
    id: batch.id,
    name: batch.name,
    description: batch.description,
    program: batch.mentorshipProgram,
    mentors: batch.mentorAssignments.map((assignment) => assignment.mentor),
    tasks: batch.tasks.map((task) => ({ id: task.id, title: task.title, description: task.description, startDatetime: task.startDatetime, endDatetime: task.endDatetime, status: task.completions[0]?.status ?? TaskStatus.PENDING, completedAt: task.completions[0]?.completedAt ?? null, isActiveNow: task.startDatetime <= now && task.endDatetime >= now })),
    sessions: batch.liveSessions.map((session) => ({ id: session.id, title: session.title, description: session.description, startDatetime: session.startDatetime, endDatetime: session.endDatetime, attended: session.attendance.length > 0, isActiveNow: session.startDatetime <= now && session.endDatetime >= now })),
    notices: batch.notices,
    tests: batch.tests.map((test) => {
      const attempt = test.attempts[0];
      return { id: test.id, name: test.name, description: test.description, startDatetime: test.startDatetime, endDatetime: test.endDatetime, totalMarks: n(test.totalMarks), sectionCount: test._count.sections, isActiveNow: test.startDatetime <= now && test.endDatetime >= now, attempted: Boolean(attempt && isSubmitted(attempt.status)), attemptId: attempt?.id ?? null, score: attempt ? n(attempt.marksScored) : null };
    }),
  };
};

export const batchAttemptDetail = async (parentId: string, studentId: string, attemptId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchAttemptAnalysis(studentId, attemptId);
};

export const changeParentPassword = async (parentId: string, input: ChangePasswordInput) => {
  if (input.currentPassword === input.newPassword) throw new AppError(400, 'New password must be different from your current password.');
  const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: { passwordHash: true } });
  if (!parent) throw new AppError(404, 'Parent account not found.');
  if (!(await bcrypt.compare(input.currentPassword, parent.passwordHash))) throw new AppError(400, 'Current password is incorrect.');
  await prisma.parent.update({ where: { id: parentId }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } });
  return { message: 'Password changed successfully.' };
};

const createParentOtp = async (parentId: string, email: string, purpose: EmailVerificationPurpose) => {
  const otp = String(randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 12);
  await prisma.emailVerification.create({
    data: { email, otpHash, purpose, accountId: parentId, accountRole: VerificationAccountRole.PARENT, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  const delivery = await sendOtpEmail({
    to: email,
    subject: purpose === EmailVerificationPurpose.CHANGE_EMAIL ? 'Confirm your new Entrance UG parent email' : 'Verify your Entrance UG parent email',
    heading: purpose === EmailVerificationPurpose.CHANGE_EMAIL ? 'Confirm your new email' : 'Verify your email address',
    intro: 'Use this OTP to verify your Entrance UG parent account email.',
    otp,
  });
  return { email, devOtp: delivery.devOtp, expiresInMinutes: 10 };
};

export const requestParentEmailVerification = async (parentId: string) => {
  const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: { email: true, emailVerified: true } });
  if (!parent) throw new AppError(404, 'Parent account not found.');
  if (parent.emailVerified) return { email: parent.email, alreadyVerified: true, devOtp: null };
  return { ...(await createParentOtp(parentId, parent.email, EmailVerificationPurpose.REGISTER)), alreadyVerified: false };
};

export const verifyParentEmail = async (parentId: string, otp: string) => {
  const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: { email: true } });
  if (!parent) throw new AppError(404, 'Parent account not found.');
  const record = await prisma.emailVerification.findFirst({ where: { email: parent.email, purpose: EmailVerificationPurpose.REGISTER, accountId: parentId, accountRole: VerificationAccountRole.PARENT, verifiedAt: null, expiresAt: { gte: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!record) throw new AppError(404, 'No active verification code found.');
  if (!(await bcrypt.compare(otp, record.otpHash))) throw new AppError(400, 'Invalid verification code.');
  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.parent.update({ where: { id: parentId }, data: { emailVerified: true, emailVerifiedAt: now }, select: parentProfileSelect }),
    prisma.emailVerification.update({ where: { id: record.id }, data: { verifiedAt: now } }),
  ]);
  return updated;
};

export const requestParentEmailChange = async (parentId: string, email: string) => {
  const existing = await prisma.parent.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== parentId) throw new AppError(409, 'That email address is already used by another parent.');
  return { ...(await createParentOtp(parentId, email, EmailVerificationPurpose.CHANGE_EMAIL)), alreadyVerified: false };
};

export const verifyParentEmailChange = async (parentId: string, email: string, otp: string) => {
  const record = await prisma.emailVerification.findFirst({ where: { email, purpose: EmailVerificationPurpose.CHANGE_EMAIL, accountId: parentId, accountRole: VerificationAccountRole.PARENT, verifiedAt: null, expiresAt: { gte: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!record) throw new AppError(404, 'No active email change code found.');
  if (!(await bcrypt.compare(otp, record.otpHash))) throw new AppError(400, 'Invalid verification code.');
  const existing = await prisma.parent.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== parentId) throw new AppError(409, 'That email address is already used by another parent.');
  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.parent.update({ where: { id: parentId }, data: { email, emailVerified: true, emailVerifiedAt: now }, select: parentProfileSelect }),
    prisma.emailVerification.update({ where: { id: record.id }, data: { verifiedAt: now } }),
  ]);
  return updated;
};

export const answerMix = (correct: number, incorrect: number, unattempted: number) => {
  const total = correct + incorrect + unattempted;
  return {
    correct,
    incorrect,
    unattempted,
    correctPercent: total ? Math.round((correct / total) * 100) : 0,
    incorrectPercent: total ? Math.round((incorrect / total) * 100) : 0,
    unattemptedPercent: total ? Math.round((unattempted / total) * 100) : 0,
  };
};

export const answerStatusTotals = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  const [mock, content, batch, rc] = await Promise.all([
    prisma.mockAttempt.aggregate({ where: { studentId, status: { in: submitted } }, _sum: { correctAnswers: true, incorrectAnswers: true, unattemptedAnswers: true } }),
    prisma.contentAttempt.aggregate({ where: { studentId, status: { in: submitted } }, _sum: { correctAnswers: true, incorrectAnswers: true, unattemptedAnswers: true } }),
    prisma.batchAttempt.aggregate({ where: { studentId, status: { in: submitted } }, _sum: { correctAnswers: true, incorrectAnswers: true, unattemptedAnswers: true } }),
    prisma.rcAttempt.aggregate({ where: { studentId, submittedAt: { not: null } }, _sum: { correctAnswers: true, incorrectAnswers: true, unattemptedAnswers: true } }),
  ]);
  return { mock: answerMix(mock._sum.correctAnswers ?? 0, mock._sum.incorrectAnswers ?? 0, mock._sum.unattemptedAnswers ?? 0), content: answerMix(content._sum.correctAnswers ?? 0, content._sum.incorrectAnswers ?? 0, content._sum.unattemptedAnswers ?? 0), mentorship: answerMix(batch._sum.correctAnswers ?? 0, batch._sum.incorrectAnswers ?? 0, batch._sum.unattemptedAnswers ?? 0), rc: answerMix(rc._sum.correctAnswers ?? 0, rc._sum.incorrectAnswers ?? 0, rc._sum.unattemptedAnswers ?? 0) };
};
