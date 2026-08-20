import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';
import type { ComprehensionInput, NoticeInput, QuestionInput, SectionInput, SessionInput, TaskInput, TestInput } from './mentor.schemas.js';

const n = (value: unknown) => Number(value ?? 0);
const submitted = ['SUBMITTED', 'AUTO_SUBMITTED'] as const;

const phaseFor = (start: Date, end: Date) => {
  const now = new Date();
  if (start > now) return 'UPCOMING' as const;
  if (end < now) return 'PAST' as const;
  return 'LIVE' as const;
};

const requireBatch = async (mentorId: string, batchId: string) => {
  const batch = await prisma.mentorshipBatch.findFirst({
    where: { id: batchId, isActive: true, mentorAssignments: { some: { mentorId, isActive: true } } },
    include: {
      mentorshipProgram: { select: { id: true, name: true } },
      mentorAssignments: { where: { isActive: true }, include: { mentor: { select: { id: true, name: true, profileImage: true, qualification: true } } } },
    },
  });
  if (!batch) throw new AppError(404, 'Batch is not assigned to this mentor.');
  return batch;
};

const requireTask = async (mentorId: string, taskId: string) => {
  const task = await prisma.batchTask.findFirst({ where: { id: taskId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!task) throw new AppError(404, 'Task not found.');
  return task;
};

const requireSession = async (mentorId: string, sessionId: string) => {
  const session = await prisma.liveSession.findFirst({ where: { id: sessionId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!session) throw new AppError(404, 'Live session not found.');
  return session;
};

const requireNotice = async (mentorId: string, noticeId: string) => {
  const notice = await prisma.batchNotice.findFirst({ where: { id: noticeId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!notice) throw new AppError(404, 'Notice not found.');
  return notice;
};

const requireTest = async (mentorId: string, testId: string) => {
  const test = await prisma.batchTest.findFirst({ where: { id: testId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!test) throw new AppError(404, 'Batch test not found.');
  return test;
};

export const profile = async (mentorId: string) => {
  const mentor = await prisma.mentor.findUnique({ where: { id: mentorId }, select: { id: true, name: true, username: true, email: true, emailVerified: true, phoneNumber: true, qualification: true, experienceYears: true, bio: true, profileImage: true } });
  if (!mentor) throw new AppError(404, 'Mentor not found.');
  return mentor;
};

export const programs = async (mentorId: string) => prisma.mentorshipProgram.findMany({
  where: { isActive: true, batches: { some: { mentorAssignments: { some: { mentorId, isActive: true } } } } },
  orderBy: { name: 'asc' },
  select: {
    id: true, name: true, description: true,
    _count: { select: { batches: { where: { mentorAssignments: { some: { mentorId, isActive: true } } } } } },
  },
});

export const batches = async (mentorId: string, programId: string) => {
  const now = new Date();
  return prisma.mentorshipBatch.findMany({
    where: { mentorshipProgramId: programId, isActive: true, mentorAssignments: { some: { mentorId, isActive: true } } },
    orderBy: { name: 'asc' },
    include: {
      mentorshipProgram: { select: { id: true, name: true } },
      studentAccesses: { where: { isActive: true, expiryDate: { gte: now } }, select: { id: true } },
      _count: {
        select: {
          tasks: { where: { startDatetime: { lte: now }, endDatetime: { gte: now } } },
          liveSessions: { where: { startDatetime: { lte: now }, endDatetime: { gte: now } } },
          tests: { where: { isActive: true, startDatetime: { lte: now }, endDatetime: { gte: now } } },
          doubts: { where: { status: 'OPEN' } },
        },
      },
    },
  });
};

export const overview = async (mentorId: string, batchId: string) => {
  const batch = await requireBatch(mentorId, batchId);
  const now = new Date();
  const [tasks, sessions, notices, tests, students, doubts] = await Promise.all([
    prisma.batchTask.findMany({ where: { mentorshipBatchId: batchId, startDatetime: { lte: now }, endDatetime: { gte: now } }, orderBy: { endDatetime: 'asc' }, take: 4, include: { completions: { select: { id: true } } } }),
    prisma.liveSession.findMany({ where: { mentorshipBatchId: batchId, startDatetime: { lte: now }, endDatetime: { gte: now } }, orderBy: { endDatetime: 'asc' }, take: 4, include: { attendance: { select: { id: true } } } }),
    prisma.batchNotice.findMany({ where: { mentorshipBatchId: batchId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.batchTest.findMany({ where: { mentorshipBatchId: batchId, isActive: true, startDatetime: { lte: now }, endDatetime: { gte: now } }, orderBy: { endDatetime: 'asc' }, take: 4, include: { attempts: { where: { status: { in: [...submitted] } }, select: { id: true } }, sections: { select: { _count: { select: { questions: true } } } }, difficulty: { select: { name: true } } } }),
    prisma.studentBatchAccess.count({ where: { mentorshipBatchId: batchId, isActive: true, expiryDate: { gte: now } } }),
    prisma.doubt.count({ where: { mentorshipBatchId: batchId, status: 'OPEN' } }),
  ]);
  return {
    id: batch.id, name: batch.name, description: batch.description, program: batch.mentorshipProgram,
    mentors: batch.mentorAssignments.map((item) => item.mentor),
    stats: { activeTasks: tasks.length, liveSessions: sessions.length, liveTests: tests.length, students, openDoubts: doubts },
    tasks: tasks.map((task) => ({ ...task, phase: phaseFor(task.startDatetime, task.endDatetime), completionCount: task.completions.length })),
    sessions: sessions.map((session) => ({ ...session, phase: phaseFor(session.startDatetime, session.endDatetime), attendanceCount: session.attendance.length, attendancePercent: students ? Math.round((session.attendance.length / students) * 100) : 0 })),
    notices,
    tests: tests.map((test) => ({ id: test.id, name: test.name, description: test.description, startDatetime: test.startDatetime, endDatetime: test.endDatetime, durationMinutes: test.durationMinutes, totalMarks: n(test.totalMarks), difficulty: test.difficulty.name, questionCount: test.sections.reduce((sum, section) => sum + section._count.questions, 0), phase: phaseFor(test.startDatetime, test.endDatetime), attemptCount: test.attempts.length })),
  };
};

export const students = async (mentorId: string, batchId: string, search = '') => {
  await requireBatch(mentorId, batchId);
  const accesses = await prisma.studentBatchAccess.findMany({
    where: {
      mentorshipBatchId: batchId, isActive: true, expiryDate: { gte: new Date() },
      student: search ? { OR: [{ username: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] } : undefined,
    },
    orderBy: { joinedAt: 'desc' },
    include: {
      student: { select: { id: true, name: true, username: true, profileImage: true, className: true, schoolName: true } },
    },
  });
  return Promise.all(accesses.map(async (access) => {
    const [completedTasks, attendedSessions, attempts, openDoubts] = await Promise.all([
      prisma.completedTask.count({ where: { studentId: access.studentId, status: 'COMPLETED', batchTask: { mentorshipBatchId: batchId } } }),
      prisma.attendance.count({ where: { studentId: access.studentId, liveSession: { mentorshipBatchId: batchId } } }),
      prisma.batchAttempt.findMany({ where: { studentId: access.studentId, status: { in: [...submitted] }, batchTest: { mentorshipBatchId: batchId } }, select: { marksScored: true, accuracy: true } }),
      prisma.doubt.count({ where: { studentId: access.studentId, mentorshipBatchId: batchId, status: 'OPEN' } }),
    ]);
    return {
      student: access.student,
      joinedAt: access.joinedAt,
      expiryDate: access.expiryDate,
      stats: {
        completedTasks,
        attendedSessions,
        testsAttempted: attempts.length,
        averageScore: attempts.length ? Number((attempts.reduce((sum, attempt) => sum + n(attempt.marksScored), 0) / attempts.length).toFixed(2)) : 0,
        averageAccuracy: attempts.length ? Number((attempts.reduce((sum, attempt) => sum + n(attempt.accuracy), 0) / attempts.length).toFixed(2)) : 0,
        openDoubts,
      },
    };
  }));
};

export const studentDetail = async (mentorId: string, batchId: string, studentId: string) => {
  await requireBatch(mentorId, batchId);
  const link = await prisma.studentBatchAccess.findFirst({ where: { studentId, mentorshipBatchId: batchId }, include: { student: { select: { id: true, name: true, username: true, profileImage: true, className: true, schoolName: true, city: true, state: true } } } });
  if (!link) throw new AppError(404, 'Student is not in this batch.');
  const [tasks, sessions, attempts, doubts] = await Promise.all([
    prisma.completedTask.findMany({ where: { studentId, batchTask: { mentorshipBatchId: batchId } }, include: { batchTask: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.attendance.findMany({ where: { studentId, liveSession: { mentorshipBatchId: batchId } }, include: { liveSession: true }, orderBy: { joinedAt: 'desc' } }),
    prisma.batchAttempt.findMany({ where: { studentId, status: { in: [...submitted] }, batchTest: { mentorshipBatchId: batchId } }, orderBy: { submittedAt: 'desc' }, include: { batchTest: { include: { difficulty: { select: { name: true } }, sections: { select: { _count: { select: { questions: true } } } } } } } }),
    prisma.doubt.findMany({ where: { studentId, mentorshipBatchId: batchId }, orderBy: { createdAt: 'desc' }, take: 10, include: { _count: { select: { replies: true } } } }),
  ]);
  return {
    student: link.student,
    membership: { joinedAt: link.joinedAt, expiryDate: link.expiryDate, accessSource: link.accessSource },
    tasks: tasks.map((row) => ({ id: row.batchTaskId, title: row.batchTask.title, status: row.status, completedAt: row.completedAt, endDatetime: row.batchTask.endDatetime })),
    sessions: sessions.map((row) => ({ id: row.liveSessionId, title: row.liveSession.title, joinedAt: row.joinedAt, startDatetime: row.liveSession.startDatetime })),
    attempts: attempts.map((attempt) => ({ id: attempt.id, submittedAt: attempt.submittedAt, marksScored: n(attempt.marksScored), totalMarks: n(attempt.totalMarks), accuracy: n(attempt.accuracy), correctAnswers: attempt.correctAnswers, incorrectAnswers: attempt.incorrectAnswers, unattemptedAnswers: attempt.unattemptedAnswers, test: { id: attempt.batchTest.id, name: attempt.batchTest.name, difficulty: attempt.batchTest.difficulty.name, questionCount: attempt.batchTest.sections.reduce((sum, section) => sum + section._count.questions, 0) } })),
    doubts,
  };
};

export const tasks = async (mentorId: string, batchId: string) => {
  await requireBatch(mentorId, batchId);
  const totalStudents = await prisma.studentBatchAccess.count({ where: { mentorshipBatchId: batchId, isActive: true, expiryDate: { gte: new Date() } } });
  const rows = await prisma.batchTask.findMany({ where: { mentorshipBatchId: batchId }, orderBy: { startDatetime: 'desc' }, include: { completions: { include: { student: { select: { id: true, name: true, username: true } } } } } });
  return rows.map((task) => ({ ...task, phase: phaseFor(task.startDatetime, task.endDatetime), completionCount: task.completions.filter((item) => item.status === 'COMPLETED').length, completionPercent: totalStudents ? Math.round((task.completions.filter((item) => item.status === 'COMPLETED').length / totalStudents) * 100) : 0 }));
};

export const createTask = async (mentorId: string, batchId: string, data: TaskInput) => {
  await requireBatch(mentorId, batchId);
  return prisma.batchTask.create({ data: { mentorshipBatchId: batchId, title: data.title, description: data.description, attachmentUrl: data.attachmentUrl ?? null, startDatetime: new Date(data.startDatetime), endDatetime: new Date(data.endDatetime), createdById: mentorId, updatedById: mentorId } });
};

export const updateTask = async (mentorId: string, taskId: string, data: TaskInput) => {
  await requireTask(mentorId, taskId);
  return prisma.batchTask.update({ where: { id: taskId }, data: { title: data.title, description: data.description, attachmentUrl: data.attachmentUrl ?? null, startDatetime: new Date(data.startDatetime), endDatetime: new Date(data.endDatetime), updatedById: mentorId } });
};

export const sessions = async (mentorId: string, batchId: string) => {
  await requireBatch(mentorId, batchId);
  const totalStudents = await prisma.studentBatchAccess.count({ where: { mentorshipBatchId: batchId, isActive: true, expiryDate: { gte: new Date() } } });
  const rows = await prisma.liveSession.findMany({ where: { mentorshipBatchId: batchId }, orderBy: { startDatetime: 'desc' }, include: { attendance: { include: { student: { select: { id: true, name: true, username: true } } } } } });
  return rows.map((session) => ({ ...session, phase: phaseFor(session.startDatetime, session.endDatetime), attendanceCount: session.attendance.length, attendancePercent: totalStudents ? Math.round((session.attendance.length / totalStudents) * 100) : 0 }));
};

export const createSession = async (mentorId: string, batchId: string, data: SessionInput) => {
  await requireBatch(mentorId, batchId);
  return prisma.liveSession.create({ data: { mentorshipBatchId: batchId, title: data.title, description: data.description, meetingLink: data.meetingLink, startDatetime: new Date(data.startDatetime), endDatetime: new Date(data.endDatetime), createdById: mentorId } });
};

export const updateSession = async (mentorId: string, sessionId: string, data: SessionInput) => {
  await requireSession(mentorId, sessionId);
  return prisma.liveSession.update({ where: { id: sessionId }, data: { title: data.title, description: data.description, meetingLink: data.meetingLink, startDatetime: new Date(data.startDatetime), endDatetime: new Date(data.endDatetime) } });
};

export const notices = async (mentorId: string, batchId: string) => {
  await requireBatch(mentorId, batchId);
  return prisma.batchNotice.findMany({ where: { mentorshipBatchId: batchId }, orderBy: { createdAt: 'desc' }, include: { createdByMentor: { select: { id: true, name: true } }, createdByAdmin: { select: { id: true, name: true, role: true } } } });
};

export const createNotice = async (mentorId: string, batchId: string, data: NoticeInput) => {
  await requireBatch(mentorId, batchId);
  return prisma.batchNotice.create({ data: { mentorshipBatchId: batchId, title: data.title, description: data.description, attachmentUrl: data.attachmentUrl ?? null, createdByMentorId: mentorId, updatedByMentorId: mentorId } });
};

export const updateNotice = async (mentorId: string, noticeId: string, data: NoticeInput) => {
  await requireNotice(mentorId, noticeId);
  return prisma.batchNotice.update({ where: { id: noticeId }, data: { title: data.title, description: data.description, attachmentUrl: data.attachmentUrl ?? null, updatedByMentorId: mentorId } });
};

export const doubts = async (mentorId: string, batchId: string, options: { status?: string; visibility?: string; search?: string }) => {
  await requireBatch(mentorId, batchId);
  const status = ['OPEN', 'ANSWERED', 'CLOSED'].includes(options.status ?? '') ? options.status as 'OPEN' | 'ANSWERED' | 'CLOSED' : undefined;
  const visibility = ['PUBLIC', 'PRIVATE'].includes(options.visibility ?? '') ? options.visibility as 'PUBLIC' | 'PRIVATE' : undefined;
  return prisma.doubt.findMany({
    where: {
      mentorshipBatchId: batchId,
      ...(status ? { status } : {}),
      ...(visibility ? { visibility } : {}),
      ...(options.search ? { OR: [{ title: { contains: options.search, mode: 'insensitive' } }, { student: { username: { contains: options.search, mode: 'insensitive' } } }, { student: { name: { contains: options.search, mode: 'insensitive' } } }] } : {}),
    },
    orderBy: [{ isPinned: 'desc' }, { lastReplyAt: 'desc' }, { createdAt: 'desc' }],
    include: { student: { select: { id: true, name: true, username: true, profileImage: true } }, _count: { select: { replies: true } } },
  });
};

export const replies = async (mentorId: string, doubtId: string, parentReplyId?: string | null, take = 3, skip = 0) => {
  const doubt = await prisma.doubt.findFirst({ where: { id: doubtId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!doubt) throw new AppError(404, 'Doubt not found.');
  return prisma.doubtReply.findMany({ where: { doubtId, parentReplyId: parentReplyId ?? null }, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], take: Math.min(Math.max(take, 1), 20), skip: Math.max(skip, 0), include: { student: { select: { id: true, name: true, username: true } }, mentor: { select: { id: true, name: true } }, admin: { select: { id: true, name: true, role: true } }, _count: { select: { childReplies: true } } } });
};

export const addReply = async (mentorId: string, doubtId: string, data: { replyText: string; parentReplyId?: string | null; attachmentUrl?: string | null }) => prisma.$transaction(async (tx) => {
  const doubt = await tx.doubt.findFirst({ where: { id: doubtId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!doubt) throw new AppError(404, 'Doubt not found.');
  if (doubt.status === 'CLOSED') throw new AppError(409, 'Closed doubts cannot receive new replies.');
  if (data.parentReplyId) {
    const parent = await tx.doubtReply.findFirst({ where: { id: data.parentReplyId, doubtId }, select: { id: true } });
    if (!parent) throw new AppError(400, 'Parent reply does not belong to this doubt.');
  }
  const reply = await tx.doubtReply.create({ data: { doubtId, mentorId, parentReplyId: data.parentReplyId ?? null, replyText: data.replyText, attachmentUrl: data.attachmentUrl ?? null }, include: { mentor: { select: { id: true, name: true } }, student: { select: { id: true, name: true, username: true } }, admin: { select: { id: true, name: true, role: true } }, _count: { select: { childReplies: true } } } });
  await tx.doubt.update({ where: { id: doubtId }, data: { lastReplyAt: new Date(), status: doubt.status === 'OPEN' ? 'ANSWERED' : doubt.status } });
  return reply;
});

export const setDoubtStatus = async (mentorId: string, doubtId: string, status: 'OPEN' | 'ANSWERED' | 'CLOSED') => {
  const doubt = await prisma.doubt.findFirst({ where: { id: doubtId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!doubt) throw new AppError(404, 'Doubt not found.');
  return prisma.doubt.update({ where: { id: doubtId }, data: { status } });
};

export const setDoubtPinned = async (mentorId: string, doubtId: string, isPinned: boolean) => {
  const doubt = await prisma.doubt.findFirst({ where: { id: doubtId, mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } });
  if (!doubt) throw new AppError(404, 'Doubt not found.');
  return prisma.doubt.update({ where: { id: doubtId }, data: { isPinned } });
};

export const setReplyPinned = async (mentorId: string, replyId: string, isPinned: boolean) => {
  const reply = await prisma.doubtReply.findFirst({ where: { id: replyId, doubt: { mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } } });
  if (!reply) throw new AppError(404, 'Reply not found.');
  return prisma.doubtReply.update({ where: { id: replyId }, data: { isPinned } });
};

export const tests = async (mentorId: string, batchId: string) => {
  await requireBatch(mentorId, batchId);
  const rows = await prisma.batchTest.findMany({ where: { mentorshipBatchId: batchId }, orderBy: { startDatetime: 'desc' }, include: { difficulty: { select: { id: true, name: true } }, sections: { select: { _count: { select: { questions: true } } } }, attempts: { where: { status: { in: [...submitted] } }, select: { id: true } }, analytics: true } });
  return rows.map((test) => ({ id: test.id, name: test.name, description: test.description, instructions: test.instructions, startDatetime: test.startDatetime, endDatetime: test.endDatetime, durationMinutes: test.durationMinutes, totalMarks: n(test.totalMarks), difficulty: test.difficulty, isActive: test.isActive, canGoBackBetweenSections: test.canGoBackBetweenSections, phase: phaseFor(test.startDatetime, test.endDatetime), questionCount: test.sections.reduce((sum, section) => sum + section._count.questions, 0), sectionCount: test.sections.length, attemptCount: test.attempts.length, analytics: test.analytics ? { totalAttempts: test.analytics.totalAttempts, averageScore: n(test.analytics.averageScore), highestScore: n(test.analytics.highestScore), averageAccuracy: n(test.analytics.averageAccuracy) } : null }));
};

export const testDetail = async (mentorId: string, testId: string) => {
  await requireTest(mentorId, testId);
  return prisma.batchTest.findUnique({
    where: { id: testId },
    include: {
      difficulty: true,
      analytics: true,
      sections: { orderBy: { sequenceNumber: 'asc' }, include: { analytics: true, questions: { orderBy: { sequenceNumber: 'asc' }, include: { difficulty: true, topic: { include: { subject: true } }, subtopic: true, batchComprehension: true } } } },
      attempts: { where: { status: { in: [...submitted] } }, orderBy: { submittedAt: 'desc' }, include: { student: { select: { id: true, name: true, username: true } } } },
    },
  });
};

export const createTest = async (mentorId: string, batchId: string, data: TestInput) => {
  await requireBatch(mentorId, batchId);
  return prisma.batchTest.create({ data: { mentorshipBatchId: batchId, name: data.name, description: data.description, instructions: data.instructions, difficultyId: data.difficultyId, durationMinutes: data.durationMinutes, totalMarks: 0, canGoBackBetweenSections: data.canGoBackBetweenSections, isActive: data.isActive, startDatetime: new Date(data.startDatetime), endDatetime: new Date(data.endDatetime), createdByMentorId: mentorId, updatedByMentorId: mentorId } });
};

export const updateTest = async (mentorId: string, testId: string, data: TestInput) => {
  await requireTest(mentorId, testId);
  return prisma.batchTest.update({ where: { id: testId }, data: { name: data.name, description: data.description, instructions: data.instructions, difficultyId: data.difficultyId, durationMinutes: data.durationMinutes, canGoBackBetweenSections: data.canGoBackBetweenSections, isActive: data.isActive, startDatetime: new Date(data.startDatetime), endDatetime: new Date(data.endDatetime), updatedByMentorId: mentorId } });
};

const recalcTestMarks = async (testId: string) => {
  const sections = await prisma.batchSection.findMany({ where: { batchTestId: testId }, select: { totalMarks: true } });
  await prisma.batchTest.update({ where: { id: testId }, data: { totalMarks: sections.reduce((sum, section) => sum + n(section.totalMarks), 0) } });
};

export const createSection = async (mentorId: string, testId: string, data: SectionInput) => {
  await requireTest(mentorId, testId);
  const section = await prisma.batchSection.create({ data: { batchTestId: testId, name: data.name, sequenceNumber: data.sequenceNumber, instructions: data.instructions, durationMinutes: data.durationMinutes ?? null, totalMarks: data.totalMarks, canGoBackToPreviousQuestion: data.canGoBackToPreviousQuestion, createdByMentorId: mentorId, updatedByMentorId: mentorId } });
  await recalcTestMarks(testId);
  return section;
};

export const createComprehension = async (mentorId: string, data: ComprehensionInput) => prisma.batchComprehension.create({ data: { title: data.title ?? null, passage: data.passage, createdByMentorId: mentorId, updatedByMentorId: mentorId } });

export const createQuestion = async (mentorId: string, data: QuestionInput) => {
  const section = await prisma.batchSection.findFirst({ where: { id: data.batchSectionId, batchTest: { mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } } });
  if (!section) throw new AppError(404, 'Section not found.');
  return prisma.batchQuestion.create({ data: { batchSectionId: data.batchSectionId, batchComprehensionId: data.batchComprehensionId ?? null, topicId: data.topicId, subtopicId: data.subtopicId, difficultyId: data.difficultyId, sequenceNumber: data.sequenceNumber, questionType: data.questionType, question: data.question, options: data.options ?? undefined, correctAnswers: data.correctAnswers as any, positiveMarks: data.positiveMarks, negativeMarks: data.negativeMarks, explanation: data.explanation, imageUrl: data.imageUrl ?? null, isActive: data.isActive, createdByMentorId: mentorId, updatedByMentorId: mentorId } });
};

export const masters = async () => {
  const [difficulties, subjects] = await Promise.all([
    prisma.difficultyLevel.findMany({ orderBy: { displayOrder: 'asc' } }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' }, include: { topics: { where: { isActive: true }, orderBy: { displayOrder: 'asc' }, include: { subtopics: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } } } } } }),
  ]);
  return { difficulties, subjects };
};

export const attemptAnalysis = async (mentorId: string, attemptId: string) => {
  const attempt = await prisma.batchAttempt.findFirst({ where: { id: attemptId, batchTest: { mentorshipBatch: { mentorAssignments: { some: { mentorId, isActive: true } } } } }, include: { batchTest: true } });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  const studentService = await import('../mentorship/mentorship.service.js');
  return studentService.testAttemptAnalysis(attempt.studentId, attemptId);
};
