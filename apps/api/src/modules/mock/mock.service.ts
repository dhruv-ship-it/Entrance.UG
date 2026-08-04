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

const mapExamSummary = (exam: any, sequenceLocked = false) => {
  const attempt = exam.attempts[0] ?? null;
  const hasAccess = Boolean(exam.isFree || exam.examType.studentAccesses?.length);
  const isAttempted = Boolean(attempt && isSubmittedAttempt(attempt.status));
  const inProgress = attempt?.status === AttemptStatus.IN_PROGRESS;
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
    sequenceLocked,
    canAttempt: hasAccess && !sequenceLocked && (!attempt || inProgress),
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
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    include: examInclude(studentId),
  });
  return applySequenceLocks(exams).map(({ exam, sequenceLocked }) => mapExamSummary(exam, sequenceLocked));
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
  const sequenceLocked = await isMockSequenceLocked(studentId, exam.id, exam.examTypeId, exam.mockExamTypeId);
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
    sequenceLocked,
    canAttempt: hasAccess && !sequenceLocked && (!attempt || attempt.status === AttemptStatus.IN_PROGRESS),
    isAttempted,
  };
};

export const getCatalog = async (studentId: string, input: any) => {
  const where: Prisma.MockExamWhereInput = { isActive: true, ...(input.examTypeId ? { examTypeId: input.examTypeId } : {}), ...(input.mockExamTypeId ? { mockExamTypeId: input.mockExamTypeId } : {}), ...(input.difficultyId ? { difficultyId: input.difficultyId } : {}), ...(input.search ? { OR: [{ name: { contains: input.search, mode: 'insensitive' } }, { description: { contains: input.search, mode: 'insensitive' } }] } : {}) };
  const [examTypes, examTypesWithCounts, exams] = await Promise.all([
    prisma.examType.findMany({ where: { isActive: true, mockExams: { some: where } }, orderBy: { name: 'asc' } }),
    prisma.mockExamType.findMany({ where: { isActive: true, mockExams: { some: where } }, orderBy: { name: 'asc' } }),
    prisma.mockExam.findMany({ where, orderBy: input.sort === 'marks' ? { totalMarks: 'desc' } : input.sort === 'duration' ? { durationMinutes: 'asc' } : [{ createdAt: 'asc' }, { name: 'asc' }], include: { difficulty: true, examType: { include: { studentAccesses: { where: { studentId, expiryDate: { gte: new Date() } }, select: { id: true } } } }, mockExamType: true, analytics: true, _count: { select: { sections: true, attempts: { where: { status: { in: submitted } } } } }, attempts: { where: { studentId }, take: 1, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, submittedAt: true } }, sections: { select: { _count: { select: { questions: { where: { isActive: true } } } } } } } }),
  ]);
  return { examTypes, mockExamTypes: examTypesWithCounts, exams: applySequenceLocks(exams).filter(({ exam: x }) => input.attempted === undefined || (input.attempted === 'true') === Boolean(x.attempts.length)).map(({ exam: x, sequenceLocked }) => ({ ...x, sequenceLocked, hasAccess: x.isFree || Boolean(x.examType.studentAccesses.length), totalQuestions: x.sections.reduce((sum: number, section: any) => sum + section._count.questions, 0), averageScore: n(x.analytics?.averageScore), attempted: x.attempts[0] ?? null })) };
};

const applySequenceLocks = (exams: any[]) => {
  let previousSubmitted = true;
  return exams.map((exam) => {
    const submittedAttempt = exam.attempts?.some((attempt: any) => isSubmittedAttempt(attempt.status));
    const inProgress = exam.attempts?.some((attempt: any) => attempt.status === AttemptStatus.IN_PROGRESS);
    const sequenceLocked = !previousSubmitted && !submittedAttempt && !inProgress;
    previousSubmitted = previousSubmitted && Boolean(submittedAttempt);
    return { exam, sequenceLocked };
  });
};

const isMockSequenceLocked = async (studentId: string, examId: string, examTypeId: string, mockExamTypeId: string) => {
  const exams = await prisma.mockExam.findMany({
    where: { examTypeId, mockExamTypeId, isActive: true },
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    include: { attempts: { where: { studentId }, select: { status: true } } },
  });
  return applySequenceLocks(exams).find((item) => item.exam.id === examId)?.sequenceLocked ?? false;
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

export const getAttemptAnalysis = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.mockAttempt.findFirst({
    where: { id: attemptId, studentId, status: { in: submitted } },
    include: {
      mockExam: {
        include: {
          examType: { select: { id: true, name: true } },
          mockExamType: { select: { id: true, name: true } },
          difficulty: { select: { name: true } },
          analytics: true,
          sections: {
            orderBy: { sequenceNumber: 'asc' },
            include: {
              mockSectionType: { select: { id: true, name: true } },
              analytics: true,
            },
          },
        },
      },
      sections: { include: { mockSection: { include: { mockSectionType: true, analytics: true } } } },
      answers: {
        orderBy: { answerOrder: 'asc' },
        include: {
          mockQuestion: {
            include: {
              mockSection: { include: { mockSectionType: true } },
              mockComprehension: true,
              difficulty: { select: { id: true, name: true } },
              topic: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } },
              subtopic: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!attempt) throw new AppError(404, 'Submitted mock attempt not found.');

  const averageTimeByQuestion = new Map<string, number>();
  await Promise.all(attempt.answers.map(async (answer) => {
    const aggregate = await prisma.mockAttemptAnswer.aggregate({
      where: { mockQuestionId: answer.mockQuestionId, mockAttempt: { status: { in: submitted } } },
      _avg: { timeTakenSeconds: true },
    });
    averageTimeByQuestion.set(answer.mockQuestionId, Math.round(aggregate._avg.timeTakenSeconds ?? 0));
  }));

  const scoreRows = await prisma.mockAttempt.findMany({
    where: { mockExamId: attempt.mockExamId, status: { in: submitted } },
    select: { marksScored: true },
  });

  return {
    attempt: {
      id: attempt.id,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeTakenSeconds: attempt.timeTakenSeconds,
      totalMarks: n(attempt.totalMarks),
      marksScored: n(attempt.marksScored),
      percentage: n(attempt.totalMarks) ? Number(((n(attempt.marksScored) / n(attempt.totalMarks)) * 100).toFixed(2)) : 0,
      accuracy: n(attempt.accuracy),
      correctAnswers: attempt.correctAnswers,
      incorrectAnswers: attempt.incorrectAnswers,
      unattemptedAnswers: attempt.unattemptedAnswers,
      rank: attempt.rank,
      percentile: attempt.percentile == null ? null : n(attempt.percentile),
    },
    test: {
      id: attempt.mockExam.id,
      name: attempt.mockExam.name,
      examType: attempt.mockExam.examType,
      mockExamType: attempt.mockExam.mockExamType,
      difficulty: attempt.mockExam.difficulty.name,
      analytics: attempt.mockExam.analytics ? mapMockAnalytics(attempt.mockExam.analytics) : null,
      marksDistribution: buildMarksDistribution(scoreRows.map((row) => n(row.marksScored)), n(attempt.mockExam.totalMarks)),
      sections: attempt.mockExam.sections.map((section) => ({
        id: section.id,
        name: section.name,
        sectionType: section.mockSectionType.name,
        sequenceNumber: section.sequenceNumber,
        totalMarks: n(section.totalMarks),
        analytics: section.analytics ? mapSectionAnalytics(section.analytics) : null,
      })),
    },
    sections: attempt.sections.map((section) => ({
      id: section.mockSectionId,
      name: section.mockSection.name,
      sectionType: section.mockSection.mockSectionType.name,
      timeTakenSeconds: section.timeTakenSeconds,
      marksScored: n(section.marksScored),
      correctAnswers: section.correctAnswers,
      incorrectAnswers: section.incorrectAnswers,
      unattemptedAnswers: section.unattemptedAnswers,
      accuracy: n(section.accuracy),
      analytics: section.mockSection.analytics ? mapSectionAnalytics(section.mockSection.analytics) : null,
    })),
    filters: {
      topics: uniqueBy(attempt.answers.map((answer) => answer.mockQuestion.topic), 'id'),
      difficulties: uniqueBy(attempt.answers.map((answer) => answer.mockQuestion.difficulty), 'id'),
      sections: attempt.mockExam.sections.map((section) => ({ id: section.id, name: section.name })),
    },
    answers: attempt.answers.map((answer) => ({
      id: answer.id,
      questionId: answer.mockQuestionId,
      sectionId: answer.mockSectionId,
      sectionName: answer.mockQuestion.mockSection.name,
      sectionType: answer.mockQuestion.mockSection.mockSectionType.name,
      questionNumber: answer.answerOrder,
      question: answer.mockQuestion.question,
      options: answer.mockQuestion.options,
      selectedAnswers: answer.selectedAnswers,
      correctAnswers: answer.correctAnswers,
      status: answer.status,
      marksAwarded: n(answer.marksAwarded),
      positiveMarks: n(answer.mockQuestion.positiveMarks),
      negativeMarks: n(answer.mockQuestion.negativeMarks),
      timeTakenSeconds: answer.timeTakenSeconds,
      averageTimeTakenSeconds: averageTimeByQuestion.get(answer.mockQuestionId) ?? 0,
      bookmarked: answer.bookmarked,
      markedForReview: answer.markedForReview,
      explanation: answer.mockQuestion.explanation,
      imageUrl: answer.mockQuestion.imageUrl,
      comprehension: answer.mockQuestion.mockComprehension ? { title: answer.mockQuestion.mockComprehension.title, passage: answer.mockQuestion.mockComprehension.passage } : null,
      difficulty: answer.mockQuestion.difficulty,
      topic: answer.mockQuestion.topic,
      subtopic: answer.mockQuestion.subtopic,
    })),
  };
};

export const setAttemptAnswerBookmark = async (studentId: string, answerId: string, bookmarked: boolean) => {
  const answer = await prisma.mockAttemptAnswer.findFirst({
    where: { id: answerId, mockAttempt: { studentId, status: { in: submitted } } },
    select: { id: true },
  });
  if (!answer) throw new AppError(404, 'Attempt answer not found.');
  return prisma.mockAttemptAnswer.update({ where: { id: answerId }, data: { bookmarked }, select: { id: true, bookmarked: true } });
};

export const listBookmarkedQuestions = async (studentId: string) => {
  const rows = await prisma.mockAttemptAnswer.findMany({
    where: { bookmarked: true, mockAttempt: { studentId, status: { in: submitted } } },
    orderBy: { updatedAt: 'desc' },
    include: {
      mockAttempt: { select: { id: true, submittedAt: true, mockExam: { select: { id: true, name: true, examType: { select: { name: true } }, mockExamType: { select: { name: true } } } } } },
      mockQuestion: { include: { mockSection: true, difficulty: true, topic: { include: { subject: true } }, subtopic: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    attemptId: row.mockAttemptId,
    test: row.mockAttempt.mockExam,
    submittedAt: row.mockAttempt.submittedAt,
    question: row.mockQuestion.question,
    status: row.status,
    marksAwarded: n(row.marksAwarded),
    selectedAnswers: row.selectedAnswers,
    correctAnswers: row.correctAnswers,
    section: row.mockQuestion.mockSection.name,
    difficulty: row.mockQuestion.difficulty.name,
    topic: row.mockQuestion.topic.name,
    subtopic: row.mockQuestion.subtopic.name,
  }));
};

export const getCategoryAnalytics = async (studentId: string, examTypeId: string, mockExamTypeId: string) => {
  const exams = await prisma.mockExam.findMany({
    where: { examTypeId, mockExamTypeId, isActive: true },
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    include: {
      analytics: true,
      sections: { include: { mockSectionType: true, analytics: true } },
      attempts: { where: { studentId, status: { in: submitted } }, take: 1, orderBy: { submittedAt: 'desc' }, include: { sections: { include: { mockSection: { include: { mockSectionType: true } } } } } },
    },
  });
  const attempted = exams.map((exam) => ({ exam, attempt: exam.attempts[0] ?? null })).filter((row) => row.attempt);
  const sectionTypes = uniqueBy(exams.flatMap((exam) => exam.sections.map((section) => section.mockSectionType)), 'id');
  return {
    totalTests: exams.length,
    attemptedTests: attempted.length,
    averageScore: attempted.length ? round(attempted.reduce((sum, row) => sum + n(row.attempt!.marksScored), 0) / attempted.length) : 0,
    averageOfAverages: exams.length ? round(exams.reduce((sum, exam) => sum + n(exam.analytics?.averageScore), 0) / exams.length) : 0,
    averageAccuracy: attempted.length ? round(attempted.reduce((sum, row) => sum + n(row.attempt!.accuracy), 0) / attempted.length) : 0,
    trend: exams.map((exam, index) => {
      const attempt = exam.attempts[0] ?? null;
      return {
        index: index + 1,
        examId: exam.id,
        name: exam.name,
        score: attempt ? n(attempt.marksScored) : null,
        averageScore: n(exam.analytics?.averageScore),
        rank: attempt?.rank ?? null,
        percentile: attempt?.percentile == null ? null : n(attempt.percentile),
      };
    }),
    sections: sectionTypes.map((sectionType) => {
      const matchingSections = exams.flatMap((exam) => exam.sections.filter((section) => section.mockSectionTypeId === sectionType.id));
      const userRows = attempted.flatMap((row) => row.attempt!.sections.filter((section) => section.mockSection.mockSectionTypeId === sectionType.id));
      return {
        id: sectionType.id,
        name: sectionType.name,
        averageScore: userRows.length ? round(userRows.reduce((sum, row) => sum + n(row.marksScored), 0) / userRows.length) : 0,
        averageAccuracy: userRows.length ? round(userRows.reduce((sum, row) => sum + n(row.accuracy), 0) / userRows.length) : 0,
        cohortAverageScore: matchingSections.length ? round(matchingSections.reduce((sum, section) => sum + n(section.analytics?.averageScore), 0) / matchingSections.length) : 0,
        trend: exams.map((exam, index) => {
          const section = exam.sections.find((item) => item.mockSectionTypeId === sectionType.id);
          const attempt = exam.attempts[0]?.sections.find((item) => item.mockSection.mockSectionTypeId === sectionType.id);
          return { index: index + 1, examName: exam.name, score: attempt ? n(attempt.marksScored) : null, averageScore: n(section?.analytics?.averageScore) };
        }),
      };
    }),
  };
};

const mapMockAnalytics = (analytics: any) => ({
  totalAttempts: analytics.totalAttempts,
  averageScore: n(analytics.averageScore),
  averageAccuracy: n(analytics.averageAccuracy),
  averageTimeTaken: analytics.averageTimeTaken,
  averageRank: n(analytics.averageRank),
  averagePercentile: n(analytics.averagePercentile),
  totalCorrectAnswers: analytics.totalCorrectAnswers,
  totalIncorrectAnswers: analytics.totalIncorrectAnswers,
  totalUnattemptedAnswers: analytics.totalUnattemptedAnswers,
});

const mapSectionAnalytics = (analytics: any) => ({
  totalAttempts: analytics.totalAttempts,
  averageScore: n(analytics.averageScore),
  averageAccuracy: n(analytics.averageAccuracy),
  averageTimeTaken: analytics.averageTimeTaken,
  totalCorrectAnswers: analytics.totalCorrectAnswers,
  totalIncorrectAnswers: analytics.totalIncorrectAnswers,
  totalUnattemptedAnswers: analytics.totalUnattemptedAnswers,
});

const uniqueBy = <T extends { id: string }>(rows: T[], key: keyof T) => [...new Map(rows.map((row) => [String(row[key]), row])).values()];
const round = (value: number) => Number(value.toFixed(2));
const buildMarksDistribution = (scores: number[], totalMarks: number) => {
  const bucketCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(Math.max(scores.length, 1)))));
  const interval = Math.max(1, Math.ceil(totalMarks / bucketCount));
  const buckets = Array.from({ length: Math.ceil(totalMarks / interval) || 1 }, (_, index) => {
    const start = index * interval;
    const end = index === Math.ceil(totalMarks / interval) - 1 ? totalMarks : (index + 1) * interval;
    return { label: `${start}-${end}`, start, end, count: 0 };
  });
  for (const score of scores) {
    const bucket = buckets.find((item, index) => score >= item.start && (score < item.end || index === buckets.length - 1));
    if (bucket) bucket.count += 1;
  }
  return buckets;
};
