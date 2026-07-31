import { AnswerStatus, AttemptStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';

const n = (v: any) => v == null ? 0 : typeof v === 'number' ? v : v.toNumber();
const submitted = [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED];
const isSubmittedAttempt = (status: AttemptStatus) => status === AttemptStatus.SUBMITTED || status === AttemptStatus.AUTO_SUBMITTED;
const access = (studentId: string) => ({ OR: [{ isFree: true }, { examType: { studentAccesses: { some: { studentId, expiryDate: { gte: new Date() } } } } }] });
const requireExam = async (studentId: string, id: string) => { const exam = await prisma.mockExam.findFirst({ where: { id, isActive: true, ...access(studentId) }, include: { sections: { orderBy: { sequenceNumber: 'asc' }, include: { questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' } } } } } }); if (!exam) throw new AppError(404, 'This mock is unavailable.'); return exam; };
const arraysEqual = (a: unknown, b: unknown) => JSON.stringify(Array.from(new Set((a as string[]).map(String))).sort()) === JSON.stringify(Array.from(new Set((b as string[]).map(String))).sort());

const hasMockAccess = async (studentId: string, examTypeId: string, isFree: boolean) => {
  if (isFree) return true;
  const activeAccess = await prisma.studentMockAccess.findFirst({
    where: { studentId, examTypeId, expiryDate: { gte: new Date() } },
    select: { id: true },
  });
  return Boolean(activeAccess);
};

export const listExamTypes = async () => prisma.examType.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' },
  select: { id: true, name: true, description: true },
});

export const listMockExamTypes = async () => prisma.mockExamType.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' },
  select: { id: true, name: true, description: true },
});

const mapExamSummary = (exam: any) => {
  const attempt = exam.attempts[0] ?? null;
  const hasAccess = Boolean(exam.isFree || exam.examType.studentAccesses?.length);
  const isAttempted = Boolean(attempt && isSubmittedAttempt(attempt.status));
  return {
    id: exam.id,
    name: exam.name,
    description: exam.description,
    instructionsPreview: exam.instructions,
    durationMinutes: exam.durationMinutes,
    totalMarks: n(exam.totalMarks),
    passingMarks: exam.passingMarks == null ? null : n(exam.passingMarks),
    isFree: exam.isFree,
    hasAccess,
    createdAt: exam.createdAt,
    difficulty: exam.difficulty.name,
    sectionCount: exam._count.sections,
    totalQuestions: exam.sections.reduce((sum: number, section: any) => sum + section._count.questions, 0),
    averageScore: n(exam.analytics?.averageScore),
    totalAttempts: exam.analytics?.totalAttempts ?? 0,
    attempt: attempt ? {
      id: attempt.id,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      marksScored: n(attempt.marksScored),
      accuracy: n(attempt.accuracy),
    } : null,
    canAttempt: hasAccess && (!attempt || attempt.status === AttemptStatus.IN_PROGRESS),
    isAttempted,
  };
};

const examInclude = (studentId: string) => ({
  difficulty: true,
  examType: {
    select: {
      id: true,
      name: true,
      studentAccesses: {
        where: { studentId, expiryDate: { gte: new Date() } },
        select: { id: true },
      },
    },
  },
  mockExamType: { select: { id: true, name: true } },
  analytics: true,
  _count: { select: { sections: true } },
  attempts: {
    where: { studentId },
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, status: true, submittedAt: true, marksScored: true, accuracy: true },
  },
  sections: { select: { _count: { select: { questions: { where: { isActive: true } } } } } },
});

export const listExams = async (studentId: string, examTypeId: string, mockExamTypeId: string) => {
  const exams = await prisma.mockExam.findMany({
    where: { isActive: true, examTypeId, mockExamTypeId },
    orderBy: { createdAt: 'desc' },
    include: examInclude(studentId),
  });
  return exams.map((exam) => mapExamSummary(exam));
};

export const getExamDetail = async (studentId: string, examId: string) => {
  const exam = await prisma.mockExam.findFirst({
    where: { id: examId, isActive: true },
    include: {
      difficulty: true,
      examType: { select: { id: true, name: true } },
      mockExamType: { select: { id: true, name: true } },
      analytics: true,
      sections: {
        orderBy: { sequenceNumber: 'asc' },
        include: {
          mockSectionType: { select: { name: true } },
          _count: { select: { questions: { where: { isActive: true } } } },
        },
      },
      attempts: {
        where: { studentId },
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, submittedAt: true, marksScored: true, accuracy: true },
      },
    },
  });
  if (!exam) throw new AppError(404, 'This mock is unavailable.');
  const attempt = exam.attempts[0] ?? null;
  const hasAccess = await hasMockAccess(studentId, exam.examTypeId, exam.isFree);
  const isAttempted = Boolean(attempt && isSubmittedAttempt(attempt.status));
  return {
    id: exam.id,
    name: exam.name,
    description: exam.description,
    instructionsPreview: exam.instructions,
    instructions: exam.instructions,
    durationMinutes: exam.durationMinutes,
    totalMarks: n(exam.totalMarks),
    passingMarks: exam.passingMarks == null ? null : n(exam.passingMarks),
    isFree: exam.isFree,
    hasAccess,
    createdAt: exam.createdAt,
    canGoBackBetweenSections: exam.canGoBackBetweenSections,
    difficulty: exam.difficulty.name,
    examType: exam.examType,
    mockExamType: exam.mockExamType,
    averageScore: n(exam.analytics?.averageScore),
    totalAttempts: exam.analytics?.totalAttempts ?? 0,
    sectionCount: exam.sections.length,
    totalQuestions: exam.sections.reduce((sum, section) => sum + section._count.questions, 0),
    sections: exam.sections.map((section) => ({
      id: section.id,
      name: section.name,
      sectionType: section.mockSectionType.name,
      questionCount: section._count.questions,
      durationMinutes: section.durationMinutes,
      totalMarks: n(section.totalMarks),
    })),
    attempt: attempt ? {
      id: attempt.id,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      marksScored: n(attempt.marksScored),
      accuracy: n(attempt.accuracy),
    } : null,
    canAttempt: hasAccess && (!attempt || attempt.status === AttemptStatus.IN_PROGRESS),
    isAttempted,
  };
};

export const getCatalog = async (studentId: string, input: any) => {
  const where: Prisma.MockExamWhereInput = { isActive: true, ...(input.examTypeId ? { examTypeId: input.examTypeId } : {}), ...(input.mockExamTypeId ? { mockExamTypeId: input.mockExamTypeId } : {}), ...(input.difficultyId ? { difficultyId: input.difficultyId } : {}), ...(input.search ? { OR: [{ name: { contains: input.search, mode: 'insensitive' } }, { description: { contains: input.search, mode: 'insensitive' } }] } : {}) };
  const [examTypes, examTypesWithCounts, exams] = await Promise.all([
    prisma.examType.findMany({ where: { isActive: true, mockExams: { some: where } }, orderBy: { name: 'asc' } }),
    prisma.mockExamType.findMany({ where: { isActive: true, mockExams: { some: where } }, orderBy: { name: 'asc' } }),
    prisma.mockExam.findMany({ where, orderBy: input.sort === 'marks' ? { totalMarks: 'desc' } : input.sort === 'duration' ? { durationMinutes: 'asc' } : { createdAt: 'desc' }, include: { difficulty: true, examType: { include: { studentAccesses: { where: { studentId, expiryDate: { gte: new Date() } }, select: { id: true } } } }, mockExamType: true, analytics: true, _count: { select: { sections: true, attempts: { where: { status: { in: submitted } } } } }, attempts: { where: { studentId }, take: 1, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, submittedAt: true } }, sections: { select: { _count: { select: { questions: { where: { isActive: true } } } } } } } }),
  ]);
  return { examTypes, mockExamTypes: examTypesWithCounts, exams: exams.filter((x) => input.attempted === undefined || (input.attempted === 'true') === Boolean(x.attempts.length)).map((x) => ({ ...x, hasAccess: x.isFree || Boolean(x.examType.studentAccesses.length), totalQuestions: x.sections.reduce((sum, section) => sum + section._count.questions, 0), averageScore: n(x.analytics?.averageScore), attempted: x.attempts[0] ?? null })) };
};

export const startAttempt = async (studentId: string, examId: string) => prisma.$transaction(async (tx) => {
  const exam = await tx.mockExam.findFirst({ where: { id: examId, isActive: true, ...access(studentId) }, include: { sections: { orderBy: { sequenceNumber: 'asc' }, include: { questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' } } } } } });
  if (!exam) throw new AppError(404, 'This mock is unavailable.');
  const existing = await tx.mockAttempt.findUnique({ where: { studentId_mockExamId: { studentId, mockExamId: examId } } });
  if (existing) return existing.status === AttemptStatus.IN_PROGRESS ? existing : (() => { throw new AppError(409, 'This mock has already been attempted.'); })();
  const attempt = await tx.mockAttempt.create({ data: { studentId, mockExamId: exam.id, startedAt: new Date(), status: AttemptStatus.IN_PROGRESS, totalMarks: exam.totalMarks, sections: { create: exam.sections.map((s) => ({ mockSectionId: s.id })) } }, select: { id: true } });
  await tx.mockAttemptAnswer.createMany({ data: exam.sections.flatMap((s) => s.questions.map((q, index) => ({ mockAttemptId: attempt.id, mockQuestionId: q.id, mockSectionId: s.id, selectedAnswers: [] as Prisma.InputJsonArray, correctAnswers: q.correctAnswers as Prisma.InputJsonValue, answerOrder: s.sequenceNumber * 10000 + index + 1 }))) });
  return attempt;
});

const ownedAttempt = async (studentId: string, id: string): Promise<any> => { const attempt = await prisma.mockAttempt.findFirst({ where: { id, studentId }, include: { mockExam: { include: { difficulty: true, examType: true, mockExamType: true, sections: { orderBy: { sequenceNumber: 'asc' }, include: { mockSectionType: true, questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' }, include: { topic: { include: { subject: true } }, subtopic: true, difficulty: true, mockComprehension: true } } } } } }, answers: true, sections: true } }); if (!attempt) throw new AppError(404, 'Attempt not found.'); return attempt; };
export const getEngine = async (studentId: string, id: string) => { const a = await ownedAttempt(studentId, id); if (a.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'This attempt is no longer active.'); return a; };
export const saveAnswer = async (studentId: string, attemptId: string, questionId: string, data: any) => { const attempt = await ownedAttempt(studentId, attemptId); if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'Submitted attempts cannot be changed.'); const answer = attempt.answers.find((x: any) => x.mockQuestionId === questionId); const question = attempt.mockExam.sections.flatMap((x: any) => x.questions).find((x: any) => x.id === questionId); if (!answer || !question) throw new AppError(404, 'Question not found.'); const section = attempt.mockExam.sections.find((x: any) => x.id === question.mockSectionId)!; if (data.visited && !section.canGoBackToPreviousQuestion) { const later = attempt.answers.some((x: any) => x.mockSectionId === section.id && x.visited && x.answerOrder > answer.answerOrder); if (later) throw new AppError(409, 'You cannot return to an earlier question in this section.'); }
  return prisma.mockAttemptAnswer.update({ where: { id: answer.id }, data: { ...data, answeredAt: data.selectedAnswers?.length ? new Date() : null } }); };
export const submitAttempt = async (studentId: string, id: string, sectionTimes: any[]) => prisma.$transaction(async (tx) => { const attempt = await ownedAttempt(studentId, id); if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'This attempt has already been submitted.'); const now = new Date(); const elapsed = Math.min(attempt.mockExam.durationMinutes * 60, Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000))); let correct = 0, incorrect = 0, unattempted = 0, score = 0; const sectionStats = new Map<string, any>(); for (const sec of attempt.mockExam.sections) sectionStats.set(sec.id, { correct: 0, incorrect: 0, unattempted: 0, score: 0 });
  for (const answer of attempt.answers) { const q = attempt.mockExam.sections.flatMap((s: any) => s.questions).find((x: any) => x.id === answer.mockQuestionId)!; const selected = answer.selectedAnswers as string[]; let status: AnswerStatus = AnswerStatus.UNATTEMPTED; let marks = 0; if (!selected.length) unattempted++; else if (arraysEqual(selected, q.correctAnswers)) { status = AnswerStatus.CORRECT; marks = n(q.positiveMarks); correct++; } else { status = q.questionType === 'MULTIPLE_CORRECT' && selected.some((x) => (q.correctAnswers as string[]).includes(x)) ? AnswerStatus.PARTIALLY_CORRECT : AnswerStatus.INCORRECT; marks = -n(q.negativeMarks); incorrect++; } score += marks; const s = sectionStats.get(q.mockSectionId); if (status === AnswerStatus.CORRECT) s.correct++; else if (status === AnswerStatus.UNATTEMPTED) s.unattempted++; else s.incorrect++; s.score += marks; await tx.mockAttemptAnswer.update({ where: { id: answer.id }, data: { status, marksAwarded: marks } }); }
  await tx.mockAttempt.update({ where: { id }, data: { status: AttemptStatus.SUBMITTED, submittedAt: now, timeTakenSeconds: elapsed, marksScored: score, correctAnswers: correct, incorrectAnswers: incorrect, unattemptedAnswers: unattempted, accuracy: correct + incorrect ? (correct / (correct + incorrect)) * 100 : 0 } });
  for (const sec of attempt.mockExam.sections) { const s = sectionStats.get(sec.id); const time = sectionTimes.find((x) => x.sectionId === sec.id)?.timeTakenSeconds ?? 0; await tx.mockAttemptSection.update({ where: { mockAttemptId_mockSectionId: { mockAttemptId: id, mockSectionId: sec.id } }, data: { timeTakenSeconds: time, marksScored: s.score, correctAnswers: s.correct, incorrectAnswers: s.incorrect, unattemptedAnswers: s.unattempted, accuracy: s.correct + s.incorrect ? (s.correct / (s.correct + s.incorrect)) * 100 : 0 } }); }
  return { id, score, correct, incorrect, unattempted }; });
