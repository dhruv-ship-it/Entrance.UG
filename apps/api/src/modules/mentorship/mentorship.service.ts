import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';

const activeMembership = (studentId: string, batchId?: string) => ({
  studentId,
  isActive: true,
  expiryDate: { gte: new Date() },
  ...(batchId ? { mentorshipBatchId: batchId } : {}),
});

const phaseFor = (start: Date, end: Date) => {
  const current = new Date();
  if (start > current) return 'UPCOMING' as const;
  if (end < current) return 'PAST' as const;
  return 'LIVE' as const;
};

const toNumber = (value: unknown) => Number(value ?? 0);

const requireBatchAccess = async (studentId: string, batchId: string) => {
  const batch = await prisma.mentorshipBatch.findFirst({
    where: {
      id: batchId,
      isActive: true,
      studentAccesses: { some: activeMembership(studentId, batchId) },
    },
    select: {
      id: true,
      name: true,
      description: true,
      maximumStudents: true,
      mentorshipProgram: { select: { id: true, name: true } },
      mentorAssignments: {
        where: { isActive: true },
        include: { mentor: { select: { id: true, name: true, qualification: true, profileImage: true } } },
      },
    },
  });

  if (!batch) throw new AppError(404, 'This mentorship batch is unavailable.');
  return batch;
};

const visibleDoubt = (studentId: string) => ({ OR: [{ visibility: 'PUBLIC' as const }, { studentId }] });

export const programs = async (studentId: string) => prisma.mentorshipProgram.findMany({
  where: { isActive: true, batches: { some: { studentAccesses: { some: activeMembership(studentId) } } } },
  orderBy: { name: 'asc' },
  select: { id: true, name: true, description: true, _count: { select: { batches: true } } },
});

export const batches = async (studentId: string, programId: string) => prisma.mentorshipBatch.findMany({
  where: { mentorshipProgramId: programId, isActive: true, studentAccesses: { some: activeMembership(studentId) } },
  orderBy: { name: 'asc' },
  include: {
    mentorAssignments: {
      where: { isActive: true },
      include: { mentor: { select: { id: true, name: true, qualification: true, profileImage: true } } },
    },
    studentAccesses: { where: activeMembership(studentId), select: { expiryDate: true, joinedAt: true, accessSource: true } },
    _count: { select: { tasks: true, liveSessions: true, tests: true } },
  },
});

export const overview = async (studentId: string, batchId: string) => {
  const batch = await requireBatchAccess(studentId, batchId);
  const current = new Date();

  const [tasks, notices, liveSessions, tests, completedCount, doubtCount, attendanceCount] = await Promise.all([
    prisma.batchTask.findMany({
      where: { mentorshipBatchId: batchId, startDatetime: { lte: current }, endDatetime: { gte: current } },
      orderBy: { endDatetime: 'asc' },
      take: 3,
      include: { completions: { where: { studentId }, select: { status: true, completedAt: true } } },
    }),
    prisma.batchNotice.findMany({ where: { mentorshipBatchId: batchId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.liveSession.findMany({
      where: { mentorshipBatchId: batchId, startDatetime: { lte: current }, endDatetime: { gte: current } },
      orderBy: { endDatetime: 'asc' },
      take: 3,
      include: { attendance: { where: { studentId }, select: { id: true, joinedAt: true } } },
    }),
    prisma.batchTest.findMany({
      where: { mentorshipBatchId: batchId, isActive: true, startDatetime: { lte: current }, endDatetime: { gte: current } },
      orderBy: { endDatetime: 'asc' },
      take: 3,
      include: {
        difficulty: { select: { name: true } },
        sections: { select: { _count: { select: { questions: true } } } },
        attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.completedTask.count({ where: { studentId, batchTask: { mentorshipBatchId: batchId }, status: 'COMPLETED' } }),
    prisma.doubt.count({ where: { mentorshipBatchId: batchId, ...visibleDoubt(studentId) } }),
    prisma.attendance.count({ where: { studentId, liveSession: { mentorshipBatchId: batchId } } }),
  ]);

  return {
    id: batch.id,
    name: batch.name,
    description: batch.description,
    program: batch.mentorshipProgram,
    mentors: batch.mentorAssignments.map((item) => item.mentor),
    stats: {
      activeTasks: tasks.length,
      liveSessions: liveSessions.length,
      completedTasks: completedCount,
      visibleDoubts: doubtCount,
      attendedSessions: attendanceCount,
    },
    tasks: tasks.map((task) => ({
      ...task,
      phase: phaseFor(task.startDatetime, task.endDatetime),
      completion: task.completions[0] ?? null,
    })),
    notices,
    liveSessions: liveSessions.map((session) => ({
      ...session,
      phase: phaseFor(session.startDatetime, session.endDatetime),
      attended: Boolean(session.attendance.length),
      attendedAt: session.attendance[0]?.joinedAt ?? null,
    })),
    tests: tests.map((test) => ({
      id: test.id,
      name: test.name,
      description: test.description,
      startDatetime: test.startDatetime,
      endDatetime: test.endDatetime,
      durationMinutes: test.durationMinutes,
      totalMarks: toNumber(test.totalMarks),
      difficulty: test.difficulty.name,
      questionCount: test.sections.reduce((sum, section) => sum + section._count.questions, 0),
      phase: phaseFor(test.startDatetime, test.endDatetime),
      attempted: Boolean(test.attempts.length),
      latestAttemptId: test.attempts[0]?.id ?? null,
    })),
  };
};

export const tasks = async (studentId: string, batchId: string) => {
  await requireBatchAccess(studentId, batchId);
  const rows = await prisma.batchTask.findMany({
    where: { mentorshipBatchId: batchId },
    orderBy: [{ startDatetime: 'desc' }, { endDatetime: 'desc' }],
    include: {
      completions: { where: { studentId }, select: { id: true, status: true, completedAt: true, updatedAt: true } },
      createdBy: { select: { id: true, name: true, profileImage: true } },
    },
  });

  return rows.map((task) => ({
    ...task,
    phase: phaseFor(task.startDatetime, task.endDatetime),
    completion: task.completions[0] ?? null,
    canUpdate: phaseFor(task.startDatetime, task.endDatetime) === 'LIVE',
  }));
};

export const setTaskCompletion = async (studentId: string, taskId: string, completed: boolean) => {
  const task = await prisma.batchTask.findFirst({
    where: { id: taskId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } } },
  });
  if (!task) throw new AppError(404, 'Task not found.');

  if (phaseFor(task.startDatetime, task.endDatetime) !== 'LIVE') throw new AppError(409, 'Only active tasks can be updated.');

  if (!completed) {
    await prisma.completedTask.deleteMany({ where: { batchTaskId: taskId, studentId } });
    return { taskId, completed: false };
  }

  const completion = await prisma.completedTask.upsert({
    where: { batchTaskId_studentId: { batchTaskId: taskId, studentId } },
    create: { batchTaskId: taskId, studentId, status: 'COMPLETED', completedAt: new Date() },
    update: { status: 'COMPLETED', completedAt: new Date() },
  });
  return { taskId, completed: true, completedAt: completion.completedAt };
};

export const sessions = async (studentId: string, batchId: string) => {
  await requireBatchAccess(studentId, batchId);
  const rows = await prisma.liveSession.findMany({
    where: { mentorshipBatchId: batchId },
    orderBy: [{ startDatetime: 'desc' }],
    include: {
      attendance: { where: { studentId }, select: { id: true, joinedAt: true } },
      createdBy: { select: { id: true, name: true, profileImage: true } },
    },
  });

  return rows.map((session) => ({
    ...session,
    phase: phaseFor(session.startDatetime, session.endDatetime),
    attended: Boolean(session.attendance.length),
    attendedAt: session.attendance[0]?.joinedAt ?? null,
  }));
};

export const attendanceCalendar = async (studentId: string, batchId: string, month?: string) => {
  await requireBatchAccess(studentId, batchId);

  const [year, monthNumber] = (month ?? '').split('-').map((part) => Number(part));
  const selectedYear = Number.isInteger(year) && year > 2000 ? year : new Date().getFullYear();
  const selectedMonth = Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12 ? monthNumber - 1 : new Date().getMonth();
  const start = new Date(Date.UTC(selectedYear, selectedMonth, 1));
  const end = new Date(Date.UTC(selectedYear, selectedMonth + 1, 1));

  const [sessionsInMonth, attendedInMonth] = await Promise.all([
    prisma.liveSession.findMany({
      where: { mentorshipBatchId: batchId, startDatetime: { gte: start, lt: end } },
      select: { id: true, title: true, startDatetime: true },
    }),
    prisma.attendance.findMany({
      where: { studentId, joinedAt: { gte: start, lt: end }, liveSession: { mentorshipBatchId: batchId } },
      select: { joinedAt: true, liveSessionId: true, liveSession: { select: { title: true } } },
    }),
  ]);

  const daysInMonth = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const key = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daySessions = sessionsInMonth.filter((session) => session.startDatetime.toISOString().slice(0, 10) === key);
    const attendance = attendedInMonth.filter((item) => item.joinedAt.toISOString().slice(0, 10) === key);
    return {
      date: key,
      sessionCount: daySessions.length,
      attendedCount: attendance.length,
      sessions: daySessions.map((session) => ({ id: session.id, title: session.title })),
      attendedSessions: attendance.map((item) => ({ id: item.liveSessionId, title: item.liveSession.title })),
    };
  });

  return {
    month: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`,
    days,
  };
};

export const joinSession = async (studentId: string, sessionId: string) => {
  const session = await prisma.liveSession.findFirst({
    where: { id: sessionId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } } },
    select: { id: true, meetingLink: true, startDatetime: true, endDatetime: true },
  });
  if (!session) throw new AppError(404, 'Live session not found.');
  if (phaseFor(session.startDatetime, session.endDatetime) !== 'LIVE') throw new AppError(409, 'This live session is not active.');

  await prisma.attendance.upsert({
    where: { liveSessionId_studentId: { liveSessionId: session.id, studentId } },
    create: { liveSessionId: session.id, studentId, joinedAt: new Date() },
    update: {},
  });
  return { meetingLink: session.meetingLink };
};

export const notices = async (studentId: string, batchId: string, take = 20) => {
  await requireBatchAccess(studentId, batchId);
  return prisma.batchNotice.findMany({
    where: { mentorshipBatchId: batchId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(take, 1), 50),
    include: {
      createdByMentor: { select: { id: true, name: true, profileImage: true } },
      createdByAdmin: { select: { id: true, name: true } },
    },
  });
};

export const tests = async (studentId: string, batchId: string) => {
  await requireBatchAccess(studentId, batchId);
  const rows = await prisma.batchTest.findMany({
    where: { mentorshipBatchId: batchId, isActive: true },
    orderBy: [{ startDatetime: 'desc' }],
    include: {
      difficulty: { select: { name: true } },
      sections: { select: { id: true, name: true, _count: { select: { questions: true } } } },
      attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 },
      analytics: true,
    },
  });

  return rows.map((test) => ({
    id: test.id,
    name: test.name,
    description: test.description,
    startDatetime: test.startDatetime,
    endDatetime: test.endDatetime,
    durationMinutes: test.durationMinutes,
    totalMarks: toNumber(test.totalMarks),
    difficulty: test.difficulty.name,
    questionCount: test.sections.reduce((sum, section) => sum + section._count.questions, 0),
    sectionCount: test.sections.length,
    phase: phaseFor(test.startDatetime, test.endDatetime),
    attempted: Boolean(test.attempts.length),
    latestAttemptId: test.attempts[0]?.id ?? null,
    analytics: test.analytics ? {
      totalAttempts: test.analytics.totalAttempts,
      averageScore: toNumber(test.analytics.averageScore),
      highestScore: toNumber(test.analytics.highestScore),
      averageAccuracy: toNumber(test.analytics.averageAccuracy),
    } : null,
  }));
};

export const testDetail = async (studentId: string, batchId: string, testId: string) => {
  await requireBatchAccess(studentId, batchId);
  const test = await prisma.batchTest.findFirst({
    where: { id: testId, mentorshipBatchId: batchId, isActive: true },
    include: {
      difficulty: { select: { name: true, description: true } },
      createdByMentor: { select: { id: true, name: true, profileImage: true } },
      createdByAdmin: { select: { id: true, name: true } },
      sections: {
        orderBy: { sequenceNumber: 'asc' },
        include: {
          _count: { select: { questions: true } },
          analytics: true,
        },
      },
      attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 },
      analytics: true,
    },
  });

  if (!test) throw new AppError(404, 'Batch test not found.');
  return {
    id: test.id,
    name: test.name,
    description: test.description,
    instructions: test.instructions,
    startDatetime: test.startDatetime,
    endDatetime: test.endDatetime,
    durationMinutes: test.durationMinutes,
    totalMarks: toNumber(test.totalMarks),
    canGoBackBetweenSections: test.canGoBackBetweenSections,
    difficulty: test.difficulty,
    creator: test.createdByMentor ?? test.createdByAdmin,
    phase: phaseFor(test.startDatetime, test.endDatetime),
    attempted: Boolean(test.attempts.length),
    latestAttemptId: test.attempts[0]?.id ?? null,
    sections: test.sections.map((section) => ({
      id: section.id,
      name: section.name,
      sequenceNumber: section.sequenceNumber,
      instructions: section.instructions,
      durationMinutes: section.durationMinutes,
      totalMarks: toNumber(section.totalMarks),
      questionCount: section._count.questions,
      canGoBackToPreviousQuestion: section.canGoBackToPreviousQuestion,
      analytics: section.analytics ? {
        totalAttempts: section.analytics.totalAttempts,
        averageScore: toNumber(section.analytics.averageScore),
        averageAccuracy: toNumber(section.analytics.averageAccuracy),
      } : null,
    })),
    analytics: test.analytics ? {
      totalAttempts: test.analytics.totalAttempts,
      uniqueStudentsAttempted: test.analytics.uniqueStudentsAttempted,
      averageScore: toNumber(test.analytics.averageScore),
      highestScore: toNumber(test.analytics.highestScore),
      lowestScore: toNumber(test.analytics.lowestScore),
      averageAccuracy: toNumber(test.analytics.averageAccuracy),
      averageTimeTakenSeconds: test.analytics.averageTimeTakenSeconds,
      lastAttemptAt: test.analytics.lastAttemptAt,
    } : null,
  };
};

export const listDoubts = async (studentId: string, batchId: string) => {
  await requireBatchAccess(studentId, batchId);
  return prisma.doubt.findMany({
    where: { mentorshipBatchId: batchId, ...visibleDoubt(studentId) },
    orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      student: { select: { id: true, name: true, profileImage: true } },
      _count: { select: { replies: true } },
    },
  });
};

export const createDoubt = async (studentId: string, batchId: string, data: { title: string; description: string; visibility: 'PUBLIC' | 'PRIVATE' }) => {
  await requireBatchAccess(studentId, batchId);
  return prisma.doubt.create({
    data: { mentorshipBatchId: batchId, studentId, ...data },
    include: { student: { select: { id: true, name: true, profileImage: true } }, _count: { select: { replies: true } } },
  });
};

export const replies = async (studentId: string, doubtId: string, parentReplyId?: string | null) => {
  const doubt = await prisma.doubt.findFirst({
    where: { id: doubtId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } }, ...visibleDoubt(studentId) },
    select: { id: true },
  });
  if (!doubt) throw new AppError(404, 'Doubt not found.');

  return prisma.doubtReply.findMany({
    where: { doubtId, parentReplyId: parentReplyId ?? null },
    orderBy: { createdAt: 'asc' },
    take: 20,
    include: {
      student: { select: { id: true, name: true, profileImage: true } },
      mentor: { select: { id: true, name: true, profileImage: true } },
      _count: { select: { childReplies: true } },
    },
  });
};

export const addReply = async (studentId: string, doubtId: string, data: { replyText: string; parentReplyId?: string | null }) => prisma.$transaction(async (tx) => {
  const doubt = await tx.doubt.findFirst({
    where: { id: doubtId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } }, ...visibleDoubt(studentId) },
  });
  if (!doubt) throw new AppError(404, 'Doubt not found.');

  if (data.parentReplyId) {
    const parent = await tx.doubtReply.findFirst({ where: { id: data.parentReplyId, doubtId }, select: { id: true } });
    if (!parent) throw new AppError(400, 'Parent reply does not belong to this doubt.');
  }

  const reply = await tx.doubtReply.create({
    data: { doubtId, studentId, parentReplyId: data.parentReplyId ?? null, replyText: data.replyText },
    include: {
      student: { select: { id: true, name: true, profileImage: true } },
      mentor: { select: { id: true, name: true, profileImage: true } },
      _count: { select: { childReplies: true } },
    },
  });
  await tx.doubt.update({ where: { id: doubtId }, data: { lastReplyAt: new Date(), status: 'ANSWERED' } });
  return reply;
});

export const setSatisfied = async (studentId: string, doubtId: string, isSatisfied: boolean) => {
  const doubt = await prisma.doubt.findFirst({ where: { id: doubtId, studentId }, select: { id: true } });
  if (!doubt) throw new AppError(404, 'Doubt not found.');
  return prisma.doubt.update({ where: { id: doubtId }, data: { isSatisfied } });
};
