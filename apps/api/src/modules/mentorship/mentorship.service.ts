import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';

const activeMembership = (studentId: string, batchId?: string) => ({
  studentId,
  isActive: true,
  expiryDate: { gte: new Date() },
  ...(batchId ? { mentorshipBatchId: batchId } : {}),
});

export const programs = async (studentId: string) => prisma.mentorshipProgram.findMany({
  where: { isActive: true, batches: { some: { studentAccesses: { some: activeMembership(studentId) } } } },
  orderBy: { name: 'asc' },
  select: { id: true, name: true, description: true, _count: { select: { batches: true } } },
});

export const batches = async (studentId: string, programId: string) => prisma.mentorshipBatch.findMany({
  where: { mentorshipProgramId: programId, isActive: true, studentAccesses: { some: activeMembership(studentId) } },
  orderBy: { name: 'asc' },
  include: { mentorAssignments: { where: { isActive: true }, include: { mentor: { select: { id: true, name: true, qualification: true, profileImage: true } } } }, studentAccesses: { where: activeMembership(studentId), select: { expiryDate: true } } },
});

export const overview = async (studentId: string, batchId: string) => {
  const batch = await prisma.mentorshipBatch.findFirst({
    where: { id: batchId, isActive: true, studentAccesses: { some: activeMembership(studentId, batchId) } },
    include: {
      mentorshipProgram: { select: { id: true, name: true } },
      mentorAssignments: { where: { isActive: true }, include: { mentor: { select: { id: true, name: true, qualification: true, profileImage: true } } } },
      tasks: { orderBy: { endDatetime: 'asc' }, include: { completions: { where: { studentId }, select: { status: true, completedAt: true } } } },
      notices: { orderBy: { createdAt: 'desc' }, take: 5 },
      liveSessions: { orderBy: { startDatetime: 'asc' }, take: 8, include: { attendance: { where: { studentId }, select: { id: true } } } },
      tests: { where: { isActive: true }, orderBy: { startDatetime: 'desc' }, take: 6, include: { difficulty: { select: { name: true } }, sections: { select: { _count: { select: { questions: true } } } } } },
    },
  });
  if (!batch) throw new AppError(404, 'This mentorship batch is unavailable.');
  const current = new Date();
  return {
    id: batch.id, name: batch.name, description: batch.description, program: batch.mentorshipProgram,
    mentors: batch.mentorAssignments.map((item) => item.mentor),
    tasks: batch.tasks.map((task) => ({ ...task, completion: task.completions[0] ?? null, isPast: task.endDatetime < current, isActive: task.startDatetime <= current && task.endDatetime >= current })),
    notices: batch.notices,
    liveSessions: batch.liveSessions.map((session) => ({ ...session, attended: Boolean(session.attendance.length), isPast: session.endDatetime < current, isActive: session.startDatetime <= current && session.endDatetime >= current })),
    tests: batch.tests.map((test) => ({ id: test.id, name: test.name, description: test.description, startDatetime: test.startDatetime, endDatetime: test.endDatetime, durationMinutes: test.durationMinutes, totalMarks: Number(test.totalMarks), difficulty: test.difficulty.name, questionCount: test.sections.reduce((sum, section) => sum + section._count.questions, 0), isPast: test.endDatetime < current, isActive: test.startDatetime <= current && test.endDatetime >= current })),
  };
};

export const setTaskCompletion = async (studentId: string, taskId: string, completed: boolean) => {
  const task = await prisma.batchTask.findFirst({ where: { id: taskId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } } } });
  if (!task) throw new AppError(404, 'Task not found.');
  const current = new Date();
  if (task.startDatetime > current || task.endDatetime < current) throw new AppError(409, 'Only active tasks can be updated.');
  if (!completed) { await prisma.completedTask.deleteMany({ where: { batchTaskId: taskId, studentId } }); return { taskId, completed: false }; }
  const completion = await prisma.completedTask.upsert({ where: { batchTaskId_studentId: { batchTaskId: taskId, studentId } }, create: { batchTaskId: taskId, studentId, status: 'COMPLETED', completedAt: current }, update: { status: 'COMPLETED', completedAt: current } });
  return { taskId, completed: true, completedAt: completion.completedAt };
};

export const joinSession = async (studentId: string, sessionId: string) => {
  const session = await prisma.liveSession.findFirst({ where: { id: sessionId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } } }, select: { id: true, meetingLink: true, startDatetime: true, endDatetime: true } });
  if (!session) throw new AppError(404, 'Live session not found.');
  const current = new Date();
  if (session.startDatetime > current || session.endDatetime < current) throw new AppError(409, 'This live session is not active.');
  await prisma.attendance.upsert({ where: { liveSessionId_studentId: { liveSessionId: session.id, studentId } }, create: { liveSessionId: session.id, studentId, joinedAt: current }, update: {} });
  return { meetingLink: session.meetingLink };
};

const visibleDoubt = (studentId: string) => ({ OR: [{ visibility: 'PUBLIC' as const }, { studentId }] });
export const listDoubts = async (studentId: string, batchId: string) => {
  const member = await prisma.studentBatchAccess.findFirst({ where: activeMembership(studentId, batchId), select: { id: true } });
  if (!member) throw new AppError(404, 'This batch is unavailable.');
  return prisma.doubt.findMany({ where: { mentorshipBatchId: batchId, ...visibleDoubt(studentId) }, orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }], include: { student: { select: { id: true, name: true, profileImage: true } }, _count: { select: { replies: true } } } });
};
export const createDoubt = async (studentId: string, batchId: string, data: { title: string; description: string; visibility: 'PUBLIC' | 'PRIVATE' }) => {
  const member = await prisma.studentBatchAccess.findFirst({ where: activeMembership(studentId, batchId), select: { id: true } }); if (!member) throw new AppError(404, 'This batch is unavailable.');
  return prisma.doubt.create({ data: { mentorshipBatchId: batchId, studentId, ...data }, include: { student: { select: { id: true, name: true, profileImage: true } } } });
};
export const replies = async (studentId: string, doubtId: string) => {
  const doubt = await prisma.doubt.findFirst({ where: { id: doubtId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } }, ...visibleDoubt(studentId) }, select: { id: true } }); if (!doubt) throw new AppError(404, 'Doubt not found.');
  return prisma.doubtReply.findMany({ where: { doubtId, parentReplyId: null }, orderBy: { createdAt: 'asc' }, take: 20, include: { student: { select: { id: true, name: true, profileImage: true } }, mentor: { select: { id: true, name: true, profileImage: true } }, _count: { select: { childReplies: true } } } });
};
export const addReply = async (studentId: string, doubtId: string, data: { replyText: string; parentReplyId?: string | null }) => prisma.$transaction(async (tx) => {
  const doubt = await tx.doubt.findFirst({ where: { id: doubtId, mentorshipBatch: { studentAccesses: { some: activeMembership(studentId) } }, ...visibleDoubt(studentId) } }); if (!doubt) throw new AppError(404, 'Doubt not found.');
  if (data.parentReplyId) { const parent = await tx.doubtReply.findFirst({ where: { id: data.parentReplyId, doubtId }, select: { id: true } }); if (!parent) throw new AppError(400, 'Parent reply does not belong to this doubt.'); }
  const reply = await tx.doubtReply.create({ data: { doubtId, studentId, parentReplyId: data.parentReplyId ?? null, replyText: data.replyText } }); await tx.doubt.update({ where: { id: doubtId }, data: { lastReplyAt: new Date(), status: 'ANSWERED' } }); return reply;
});
export const setSatisfied = async (studentId: string, doubtId: string, isSatisfied: boolean) => {
  const doubt = await prisma.doubt.findFirst({ where: { id: doubtId, studentId }, select: { id: true } }); if (!doubt) throw new AppError(404, 'Doubt not found.'); return prisma.doubt.update({ where: { id: doubtId }, data: { isSatisfied } });
};
