import { AttemptStatus, EmailVerificationPurpose, TaskStatus, VerificationAccountRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

import { prisma } from '../../database/prisma.js';
import { sendOtpEmail } from '../../shared/email/email.service.js';
import { AppError } from '../../shared/http/app-error.js';
import { bookmarkedAttemptAnswers as getContentBookmarks, getAttemptDetail as getContentAttemptDetail, getLearningTree as getContentLearningTree, listAttempts as getContentAttempts } from '../content/content.service.js';
import { getAttemptAnalysis as getMockAttemptAnalysis, getAttemptSwotAnalysis, getCategoryAnalytics, listBookmarkedQuestions, listExamTypes, listExams, listMockExamTypes } from '../mock/mock.service.js';
import {
  attendanceCalendar as getBatchAttendanceCalendar,
  batches as getMentorshipBatches,
  bookmarkedBatchAnswers as getBookmarkedBatchAnswers,
  listDoubts as getBatchDoubts,
  notices as getBatchNotices,
  overview as getMentorshipBatchOverview,
  programs as getMentorshipPrograms,
  replies as getDoubtReplies,
  sessions as getBatchSessions,
  submittedBatchTestAttempts as getSubmittedBatchTestAttempts,
  tasks as getBatchTasks,
  testAttemptAnalysis as getBatchAttemptAnalysis,
  testDetail as getBatchTestDetail,
  tests as getBatchTests,
} from '../mentorship/mentorship.service.js';
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
  return getContentLearningTree(studentId);
};

export const contentAttempts = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getContentAttempts(studentId);
};

export const contentAttemptDetail = async (parentId: string, studentId: string, attemptId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getContentAttemptDetail(studentId, attemptId);
};

export const contentBookmarks = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getContentBookmarks(studentId);
};

export const mentorshipPrograms = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getMentorshipPrograms(studentId);
};

export const mentorshipBatches = async (parentId: string, studentId: string, programId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getMentorshipBatches(studentId, programId);
};

export const mentorshipBatch = async (parentId: string, studentId: string, batchId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getMentorshipBatchOverview(studentId, batchId);
};

export const batchAttemptDetail = async (parentId: string, studentId: string, attemptId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchAttemptAnalysis(studentId, attemptId);
};

export const mentorshipTasks = async (parentId: string, studentId: string, batchId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchTasks(studentId, batchId);
};

export const mentorshipSessions = async (parentId: string, studentId: string, batchId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchSessions(studentId, batchId);
};

export const mentorshipAttendanceCalendar = async (parentId: string, studentId: string, batchId: string, month?: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchAttendanceCalendar(studentId, batchId, month);
};

export const mentorshipNotices = async (parentId: string, studentId: string, batchId: string, take = 20) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchNotices(studentId, batchId, take);
};

export const mentorshipTests = async (parentId: string, studentId: string, batchId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchTests(studentId, batchId);
};

export const mentorshipTestDetail = async (parentId: string, studentId: string, batchId: string, testId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchTestDetail(studentId, batchId, testId);
};

export const mentorshipAttempts = async (parentId: string, studentId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getSubmittedBatchTestAttempts(studentId);
};

export const mentorshipBookmarks = async (parentId: string, studentId: string, batchId: string) => {
  await requireLinkedStudent(parentId, studentId);
  return getBookmarkedBatchAnswers(studentId, batchId);
};

export const mentorshipDoubts = async (parentId: string, studentId: string, batchId: string, options: { scope?: string; status?: string }) => {
  await requireLinkedStudent(parentId, studentId);
  return getBatchDoubts(studentId, batchId, options);
};

export const mentorshipDoubtReplies = async (parentId: string, studentId: string, doubtId: string, parentReplyId?: string | null, take = 3, skip = 0) => {
  await requireLinkedStudent(parentId, studentId);
  return getDoubtReplies(studentId, doubtId, parentReplyId, take, skip);
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
