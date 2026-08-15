import { AnswerStatus, AttemptStatus, Prisma } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';
import { upsertMockAttemptSwotAnalysis } from '../mock/mock-swot.js';
import type { TestPillar } from './test-engine.schemas.js';

type SaveAnswerInput = {
  selectedAnswers: string[];
  visited?: boolean;
  bookmarked?: boolean;
  markedForReview?: boolean;
  timeTakenSeconds?: number;
};

type SubmitInput = {
  autoSubmitted?: boolean;
  sectionTimes: { sectionId: string; timeTakenSeconds: number }[];
};

type NormalQuestion = {
  id: string;
  sectionId: string | null;
  sectionName: string | null;
  sequenceNumber: number;
  globalOrder: number;
  questionType: string;
  question: string;
  options: unknown;
  positiveMarks: number;
  negativeMarks: number;
  imageUrl?: string | null;
  comprehension?: { id: string; title: string | null; passage: string } | null;
  difficulty?: { id: string; name: string } | null;
  topic?: { id: string; name: string; subject?: { id: string; name: string } | null } | null;
  subtopic?: { id: string; name: string } | null;
  answer: {
    id: string;
    selectedAnswers: unknown;
    visited: boolean;
    bookmarked: boolean;
    markedForReview: boolean;
    timeTakenSeconds: number;
    answeredAt: Date | null;
  };
};

const toNumber = (value: unknown) => value == null ? 0 : typeof value === 'number' ? value : Number(value);
const submittedStatuses = [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED];

const normalizeAnswers = (answers: unknown) => Array.isArray(answers) ? answers.map(String).map((x) => x.trim()).filter(Boolean) : [];
const sameAnswerSet = (selected: unknown, correct: unknown) => {
  const a = [...new Set(normalizeAnswers(selected))].sort();
  const b = [...new Set(normalizeAnswers(correct))].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

const hasOverlap = (selected: unknown, correct: unknown) => {
  const correctSet = new Set(normalizeAnswers(correct));
  return normalizeAnswers(selected).some((value) => correctSet.has(value));
};

const scoreAnswer = (selected: unknown, correct: unknown, questionType: string, positiveMarks: number, negativeMarks: number) => {
  const chosen = normalizeAnswers(selected);
  if (!chosen.length) return { status: AnswerStatus.UNATTEMPTED, marks: 0 };
  if (sameAnswerSet(chosen, correct)) return { status: AnswerStatus.CORRECT, marks: positiveMarks };
  if (questionType === 'MULTIPLE_CORRECT' && hasOverlap(chosen, correct)) return { status: AnswerStatus.PARTIALLY_CORRECT, marks: -negativeMarks };
  return { status: AnswerStatus.INCORRECT, marks: -negativeMarks };
};

const accuracy = (correct: number, incorrect: number) => correct + incorrect ? Number(((correct / (correct + incorrect)) * 100).toFixed(2)) : 0;
const percentage = (score: number, total: number) => total ? Number(((score / total) * 100).toFixed(2)) : 0;

const requireLiveWindow = (start: Date | null | undefined, end: Date | null | undefined) => {
  if (!start || !end) return;
  const now = new Date();
  if (start > now) throw new AppError(409, 'This test has not started yet.');
  if (end < now) throw new AppError(409, 'This test is closed.');
};

export const startAttempt = async (studentId: string, pillar: TestPillar, testId: string) => {
  if (pillar === 'mock') return startMockAttempt(studentId, testId);
  if (pillar === 'content') return startContentAttempt(studentId, testId);
  if (pillar === 'batch') return startBatchAttempt(studentId, testId);
  return startRcAttempt(studentId, testId);
};

export const getAttempt = async (studentId: string, pillar: TestPillar, attemptId: string) => {
  if (pillar === 'mock') return getMockEngine(studentId, attemptId);
  if (pillar === 'content') return getContentEngine(studentId, attemptId);
  if (pillar === 'batch') return getBatchEngine(studentId, attemptId);
  return getRcEngine(studentId, attemptId);
};

export const saveAnswer = async (studentId: string, pillar: TestPillar, attemptId: string, questionId: string, input: SaveAnswerInput) => {
  if (pillar === 'mock') return saveMockAnswer(studentId, attemptId, questionId, input);
  if (pillar === 'content') return saveContentAnswer(studentId, attemptId, questionId, input);
  if (pillar === 'batch') return saveBatchAnswer(studentId, attemptId, questionId, input);
  return saveRcAnswer(studentId, attemptId, questionId, input);
};

export const submitAttempt = async (studentId: string, pillar: TestPillar, attemptId: string, input: SubmitInput) => {
  if (pillar === 'mock') return submitMockAttempt(studentId, attemptId, input);
  if (pillar === 'content') return submitContentAttempt(studentId, attemptId, input);
  if (pillar === 'batch') return submitBatchAttempt(studentId, attemptId, input);
  return submitRcAttempt(studentId, attemptId, input);
};

const startMockAttempt = async (studentId: string, testId: string) => prisma.$transaction(async (tx) => {
  const test = await tx.mockExam.findFirst({
    where: {
      id: testId,
      isActive: true,
      OR: [{ isFree: true }, { examType: { studentAccesses: { some: { studentId, expiryDate: { gte: new Date() } } } } }],
    },
    include: { sections: { orderBy: { sequenceNumber: 'asc' }, include: { questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' } } } } },
  });
  if (!test) throw new AppError(404, 'This mock test is unavailable.');
  const existing = await tx.mockAttempt.findUnique({ where: { studentId_mockExamId: { studentId, mockExamId: testId } } });
  if (existing) {
    if (existing.status === AttemptStatus.IN_PROGRESS) return engineStarted('mock', existing.id);
    throw new AppError(409, 'This mock test has already been attempted.');
  }
  const attempt = await tx.mockAttempt.create({ data: { studentId, mockExamId: test.id, startedAt: new Date(), status: AttemptStatus.IN_PROGRESS, totalMarks: test.totalMarks } });
  await tx.mockAttemptSection.createMany({ data: test.sections.map((section) => ({ mockAttemptId: attempt.id, mockSectionId: section.id })) });
  await tx.mockAttemptAnswer.createMany({
    data: test.sections.flatMap((section) => section.questions.map((question, index) => ({
      mockAttemptId: attempt.id,
      mockQuestionId: question.id,
      mockSectionId: section.id,
      selectedAnswers: [],
      correctAnswers: question.correctAnswers as Prisma.InputJsonValue,
      answerOrder: section.sequenceNumber * 10_000 + index + 1,
    }))),
  });
  return engineStarted('mock', attempt.id);
});

const startContentAttempt = async (studentId: string, testId: string) => prisma.$transaction(async (tx) => {
  const test = await tx.contentTest.findFirst({
    where: { id: testId, isActive: true },
    include: { sections: { orderBy: { sequenceNumber: 'asc' }, include: { questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' } } } } },
  });
  if (!test) throw new AppError(404, 'This content test is unavailable.');
  if (!test.isFree) {
    const access = await tx.studentContentAccess.findFirst({ where: { studentId, expiryDate: { gte: new Date() } }, select: { id: true } });
    if (!access) throw new AppError(403, 'Content access is required to attempt this test.');
  }
  const existing = await tx.contentAttempt.findFirst({ where: { studentId, contentTestId: testId } });
  if (existing) {
    if (existing.status === AttemptStatus.IN_PROGRESS) return engineStarted('content', existing.id);
    throw new AppError(409, 'This content test has already been attempted.');
  }
  const attempt = await tx.contentAttempt.create({ data: { studentId, contentTestId: test.id, startedAt: new Date(), status: AttemptStatus.IN_PROGRESS, totalMarks: test.totalMarks } });
  await tx.contentAttemptSection.createMany({ data: test.sections.map((section) => ({ contentAttemptId: attempt.id, contentSectionId: section.id })) });
  await tx.contentAttemptAnswer.createMany({
    data: test.sections.flatMap((section) => section.questions.map((question) => ({
      contentAttemptId: attempt.id,
      contentQuestionId: question.id,
      contentSectionId: section.id,
      selectedAnswers: [],
      correctAnswers: question.correctAnswers as Prisma.InputJsonValue,
    }))),
  });
  return engineStarted('content', attempt.id);
});

const startBatchAttempt = async (studentId: string, testId: string) => prisma.$transaction(async (tx) => {
  const test = await tx.batchTest.findFirst({
    where: { id: testId, isActive: true, mentorshipBatch: { studentAccesses: { some: { studentId, isActive: true, expiryDate: { gte: new Date() } } } } },
    include: { sections: { orderBy: { sequenceNumber: 'asc' }, include: { questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' } } } } },
  });
  if (!test) throw new AppError(404, 'This batch test is unavailable.');
  requireLiveWindow(test.startDatetime, test.endDatetime);
  const existing = await tx.batchAttempt.findFirst({ where: { studentId, batchTestId: testId } });
  if (existing) {
    if (existing.status === AttemptStatus.IN_PROGRESS) return engineStarted('batch', existing.id);
    throw new AppError(409, 'This batch test has already been attempted.');
  }
  const attempt = await tx.batchAttempt.create({ data: { studentId, batchTestId: test.id, startedAt: new Date(), status: AttemptStatus.IN_PROGRESS, totalMarks: test.totalMarks } });
  await tx.batchAttemptSection.createMany({ data: test.sections.map((section) => ({ batchAttemptId: attempt.id, batchSectionId: section.id })) });
  await tx.batchAttemptAnswer.createMany({
    data: test.sections.flatMap((section) => section.questions.map((question) => ({
      batchAttemptId: attempt.id,
      batchQuestionId: question.id,
      batchSectionId: section.id,
      selectedAnswers: [],
      correctAnswers: question.correctAnswers as Prisma.InputJsonValue,
    }))),
  });
  return engineStarted('batch', attempt.id);
});

const startRcAttempt = async (studentId: string, testId: string) => prisma.$transaction(async (tx) => {
  const test = await tx.rcTest.findFirst({ where: { id: testId, isActive: true }, include: { questions: { orderBy: { sequenceNumber: 'asc' } } } });
  if (!test) throw new AppError(404, 'This RC test is unavailable.');
  requireLiveWindow(test.startDatetime, test.endDatetime);
  const existing = await tx.rcAttempt.findFirst({ where: { studentId, rcTestId: testId } });
  if (existing) return engineStarted('rc', existing.id);
  const attempt = await tx.rcAttempt.create({ data: { studentId, rcTestId: test.id, startedAt: new Date(), totalMarks: test.totalMarks } });
  await tx.rcAttemptAnswer.createMany({
    data: test.questions.map((question) => ({
      rcAttemptId: attempt.id,
      rcQuestionId: question.id,
      selectedAnswers: [],
      correctAnswers: question.correctAnswers as Prisma.InputJsonValue,
    })),
  });
  return engineStarted('rc', attempt.id);
});

const engineStarted = (pillar: TestPillar, id: string) => ({ pillar, id, enginePath: `/student/test-engine/${pillar}/${id}` });

const getMockEngine = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.mockAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      mockExam: {
        include: {
          examType: { select: { name: true } },
          mockExamType: { select: { name: true } },
          sections: {
            orderBy: { sequenceNumber: 'asc' },
            include: {
              questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' }, include: { mockComprehension: true, difficulty: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } }, subtopic: { select: { id: true, name: true } } } },
            },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  return normalizeEngine('mock', attempt, {
    id: attempt.mockExam.id,
    title: attempt.mockExam.name,
    description: attempt.mockExam.description,
    instructions: attempt.mockExam.instructions,
    durationMinutes: attempt.mockExam.durationMinutes,
    canGoBackBetweenSections: attempt.mockExam.canGoBackBetweenSections,
    sections: attempt.mockExam.sections.map((section) => ({
      id: section.id, name: section.name, sequenceNumber: section.sequenceNumber, instructions: section.instructions, durationMinutes: section.durationMinutes, totalMarks: toNumber(section.totalMarks), canGoBackToPreviousQuestion: section.canGoBackToPreviousQuestion,
      questions: section.questions.map((question) => ({ ...question, sectionId: section.id, sectionName: section.name, comprehension: question.mockComprehension })),
    })),
    answerByQuestionId: new Map(attempt.answers.map((answer) => [answer.mockQuestionId, answer])),
  });
};

const getContentEngine = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.contentAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      contentTest: {
        include: {
          topic: { include: { subject: true } },
          sections: {
            orderBy: { sequenceNumber: 'asc' },
            include: { questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' }, include: { contentComprehension: true, difficulty: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } }, subtopic: { select: { id: true, name: true } } } } },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  return normalizeEngine('content', attempt, {
    id: attempt.contentTest.id,
    title: attempt.contentTest.name,
    description: attempt.contentTest.description,
    instructions: attempt.contentTest.instructions,
    durationMinutes: attempt.contentTest.durationMinutes,
    canGoBackBetweenSections: attempt.contentTest.canGoBackBetweenSections,
    sections: attempt.contentTest.sections.map((section) => ({
      id: section.id, name: section.name, sequenceNumber: section.sequenceNumber, instructions: section.instructions, durationMinutes: section.durationMinutes, totalMarks: toNumber(section.totalMarks), canGoBackToPreviousQuestion: section.canGoBackToPreviousQuestion,
      questions: section.questions.map((question) => ({ ...question, sectionId: section.id, sectionName: section.name, comprehension: question.contentComprehension })),
    })),
    answerByQuestionId: new Map(attempt.answers.map((answer) => [answer.contentQuestionId, answer])),
  });
};

const getBatchEngine = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.batchAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      batchTest: {
        include: {
          mentorshipBatch: { select: { name: true } },
          sections: {
            orderBy: { sequenceNumber: 'asc' },
            include: { questions: { where: { isActive: true }, orderBy: { sequenceNumber: 'asc' }, include: { batchComprehension: true, difficulty: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } }, subtopic: { select: { id: true, name: true } } } } },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  return normalizeEngine('batch', attempt, {
    id: attempt.batchTest.id,
    title: attempt.batchTest.name,
    description: attempt.batchTest.description,
    instructions: attempt.batchTest.instructions,
    durationMinutes: attempt.batchTest.durationMinutes,
    canGoBackBetweenSections: attempt.batchTest.canGoBackBetweenSections,
    sections: attempt.batchTest.sections.map((section) => ({
      id: section.id, name: section.name, sequenceNumber: section.sequenceNumber, instructions: section.instructions, durationMinutes: section.durationMinutes, totalMarks: toNumber(section.totalMarks), canGoBackToPreviousQuestion: section.canGoBackToPreviousQuestion,
      questions: section.questions.map((question) => ({ ...question, sectionId: section.id, sectionName: section.name, comprehension: question.batchComprehension })),
    })),
    answerByQuestionId: new Map(attempt.answers.map((answer) => [answer.batchQuestionId, answer])),
  });
};

const getRcEngine = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.rcAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: { rcTest: { include: { questions: { orderBy: { sequenceNumber: 'asc' } } } }, answers: true },
  });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  return normalizeEngine('rc', attempt, {
    id: attempt.rcTest.id,
    title: attempt.rcTest.title,
    description: 'Reading comprehension test',
    instructions: attempt.rcTest.instructions,
    durationMinutes: attempt.rcTest.durationMinutes ?? 20,
    canGoBackBetweenSections: true,
    rcPassage: attempt.rcTest.passage,
    sections: [{
      id: attempt.rcTest.id,
      name: 'Reading Comprehension',
      sequenceNumber: 1,
      instructions: attempt.rcTest.instructions,
      durationMinutes: attempt.rcTest.durationMinutes,
      totalMarks: toNumber(attempt.rcTest.totalMarks),
      canGoBackToPreviousQuestion: true,
      questions: attempt.rcTest.questions.map((question) => ({ ...question, sectionId: attempt.rcTest.id, sectionName: 'Reading Comprehension', comprehension: null })),
    }],
    answerByQuestionId: new Map(attempt.answers.map((answer) => [answer.rcQuestionId, answer])),
  });
};

const normalizeEngine = (pillar: TestPillar, attempt: any, test: any) => {
  const questions: NormalQuestion[] = [];
  for (const section of test.sections) {
    for (const question of section.questions) {
      const answer = test.answerByQuestionId.get(question.id);
      questions.push({
        id: question.id,
        sectionId: section.id,
        sectionName: section.name,
        sequenceNumber: question.sequenceNumber,
        globalOrder: section.sequenceNumber * 10_000 + question.sequenceNumber,
        questionType: question.questionType,
        question: question.question,
        options: question.options,
        positiveMarks: toNumber(question.positiveMarks),
        negativeMarks: toNumber(question.negativeMarks),
        imageUrl: question.imageUrl ?? null,
        comprehension: question.comprehension ? { id: question.comprehension.id, title: question.comprehension.title, passage: question.comprehension.passage } : null,
        difficulty: question.difficulty ?? null,
        topic: question.topic ?? null,
        subtopic: question.subtopic ?? null,
        answer: {
          id: answer.id,
          selectedAnswers: answer.selectedAnswers,
          visited: answer.visited,
          bookmarked: answer.bookmarked ?? false,
          markedForReview: answer.markedForReview ?? false,
          timeTakenSeconds: answer.timeTakenSeconds,
          answeredAt: answer.answeredAt,
        },
      });
    }
  }
  questions.sort((a, b) => a.globalOrder - b.globalOrder);
  return {
    pillar,
    attempt: {
      id: attempt.id,
      status: attempt.status ?? (attempt.submittedAt ? AttemptStatus.SUBMITTED : AttemptStatus.IN_PROGRESS),
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeTakenSeconds: attempt.timeTakenSeconds,
      totalMarks: toNumber(attempt.totalMarks),
    },
    test: {
      id: test.id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      durationMinutes: test.durationMinutes,
      canGoBackBetweenSections: test.canGoBackBetweenSections,
      rcPassage: test.rcPassage ?? null,
      sections: test.sections.map((section: any) => ({
        id: section.id,
        name: section.name,
        sequenceNumber: section.sequenceNumber,
        instructions: section.instructions,
        durationMinutes: section.durationMinutes,
        totalMarks: section.totalMarks,
        canGoBackToPreviousQuestion: section.canGoBackToPreviousQuestion,
        questionCount: section.questions.length,
      })),
      questions,
    },
  };
};

const saveMockAnswer = async (studentId: string, attemptId: string, questionId: string, input: SaveAnswerInput) => {
  const attempt = await prisma.mockAttempt.findFirst({ where: { id: attemptId, studentId }, select: { id: true, status: true } });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'Submitted attempts cannot be edited.');
  const answer = await prisma.mockAttemptAnswer.findFirst({ where: { mockAttemptId: attemptId, mockQuestionId: questionId } });
  if (!answer) throw new AppError(404, 'Question not found in this attempt.');
  return prisma.mockAttemptAnswer.update({ where: { id: answer.id }, data: answerPatch(input) });
};

const saveContentAnswer = async (studentId: string, attemptId: string, questionId: string, input: SaveAnswerInput) => {
  const attempt = await prisma.contentAttempt.findFirst({ where: { id: attemptId, studentId }, select: { id: true, status: true } });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'Submitted attempts cannot be edited.');
  const answer = await prisma.contentAttemptAnswer.findFirst({ where: { contentAttemptId: attemptId, contentQuestionId: questionId } });
  if (!answer) throw new AppError(404, 'Question not found in this attempt.');
  return prisma.contentAttemptAnswer.update({ where: { id: answer.id }, data: answerPatch(input) });
};

const saveBatchAnswer = async (studentId: string, attemptId: string, questionId: string, input: SaveAnswerInput) => {
  const attempt = await prisma.batchAttempt.findFirst({ where: { id: attemptId, studentId }, select: { id: true, status: true } });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'Submitted attempts cannot be edited.');
  const answer = await prisma.batchAttemptAnswer.findFirst({ where: { batchAttemptId: attemptId, batchQuestionId: questionId } });
  if (!answer) throw new AppError(404, 'Question not found in this attempt.');
  return prisma.batchAttemptAnswer.update({ where: { id: answer.id }, data: answerPatch(input) });
};

const saveRcAnswer = async (studentId: string, attemptId: string, questionId: string, input: SaveAnswerInput) => {
  const attempt = await prisma.rcAttempt.findFirst({ where: { id: attemptId, studentId, submittedAt: null }, select: { id: true } });
  if (!attempt) throw new AppError(404, 'Active attempt not found.');
  const answer = await prisma.rcAttemptAnswer.findFirst({ where: { rcAttemptId: attemptId, rcQuestionId: questionId } });
  if (!answer) throw new AppError(404, 'Question not found in this attempt.');
  const patch = answerPatch(input);
  delete (patch as any).bookmarked;
  delete (patch as any).markedForReview;
  return prisma.rcAttemptAnswer.update({ where: { id: answer.id }, data: patch });
};

const answerPatch = (input: SaveAnswerInput) => ({
  selectedAnswers: input.selectedAnswers as Prisma.InputJsonArray,
  visited: input.visited ?? true,
  bookmarked: input.bookmarked,
  markedForReview: input.markedForReview,
  timeTakenSeconds: input.timeTakenSeconds,
  answeredAt: input.selectedAnswers.length ? new Date() : null,
});

const submitMockAttempt = async (studentId: string, attemptId: string, input: SubmitInput) => {
  const summary = await prisma.$transaction(async (tx) => {
    const attempt = await tx.mockAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: { mockExam: { include: { sections: { include: { questions: { where: { isActive: true } } } } } }, answers: true },
    });
    if (!attempt) throw new AppError(404, 'Attempt not found.');
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'This attempt has already been submitted.');
    const result = calculateSectionedResult(attempt.answers, attempt.mockExam.sections, 'mockQuestionId', 'mockSectionId');
    const submittedAt = new Date();
    await tx.mockAttempt.update({ where: { id: attemptId }, data: attemptUpdate(input, result, attempt.startedAt, attempt.mockExam.durationMinutes, submittedAt) });
    await updateMockAnswerRows(tx, result.answerResults);
    await updateMockSectionRows(tx, attemptId, result.sectionResults, input.sectionTimes);
    await recalcMockAnalytics(tx, attempt.mockExamId);
    return resultSummary(attemptId, result);
  });

  await prisma.$transaction((tx) => upsertMockAttemptSwotAnalysis(tx, attemptId)).catch((error) => {
    console.warn('Mock SWOT generation failed after submit:', error);
  });

  return summary;
};

const submitContentAttempt = async (studentId: string, attemptId: string, input: SubmitInput) => prisma.$transaction(async (tx) => {
  const attempt = await tx.contentAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: { contentTest: { include: { sections: { include: { questions: { where: { isActive: true } } } } } }, answers: true },
  });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'This attempt has already been submitted.');
  const result = calculateSectionedResult(attempt.answers, attempt.contentTest.sections, 'contentQuestionId', 'contentSectionId');
  const submittedAt = new Date();
  await tx.contentAttempt.update({ where: { id: attemptId }, data: attemptUpdate(input, result, attempt.startedAt, attempt.contentTest.durationMinutes, submittedAt) });
  await updateContentAnswerRows(tx, result.answerResults);
  await updateContentSectionRows(tx, attemptId, result.sectionResults, input.sectionTimes);
  return resultSummary(attemptId, result);
});

const submitBatchAttempt = async (studentId: string, attemptId: string, input: SubmitInput) => prisma.$transaction(async (tx) => {
  const attempt = await tx.batchAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: { batchTest: { include: { sections: { include: { questions: { where: { isActive: true } } } } } }, answers: true },
  });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new AppError(409, 'This attempt has already been submitted.');
  const result = calculateSectionedResult(attempt.answers, attempt.batchTest.sections, 'batchQuestionId', 'batchSectionId');
  const submittedAt = new Date();
  await tx.batchAttempt.update({ where: { id: attemptId }, data: attemptUpdate(input, result, attempt.startedAt, attempt.batchTest.durationMinutes, submittedAt) });
  await updateBatchAnswerRows(tx, result.answerResults);
  await updateBatchSectionRows(tx, attemptId, result.sectionResults, input.sectionTimes);
  await recalcBatchAnalytics(tx, attempt.batchTestId);
  return resultSummary(attemptId, result);
});

const submitRcAttempt = async (studentId: string, attemptId: string, input: SubmitInput) => prisma.$transaction(async (tx) => {
  const attempt = await tx.rcAttempt.findFirst({ where: { id: attemptId, studentId }, include: { rcTest: { include: { questions: true } }, answers: true } });
  if (!attempt) throw new AppError(404, 'Attempt not found.');
  if (attempt.submittedAt) throw new AppError(409, 'This attempt has already been submitted.');
  const result = calculateFlatResult(attempt.answers, attempt.rcTest.questions, 'rcQuestionId');
  const submittedAt = new Date();
  await tx.rcAttempt.update({ where: { id: attemptId }, data: flatAttemptUpdate(result, attempt.startedAt, attempt.rcTest.durationMinutes ?? 20, submittedAt) });
  await updateRcAnswerRows(tx, result.answerResults);
  await recalcRcAnalytics(tx, attempt.rcTestId);
  await recalcRcLeaderboard(tx, studentId);
  return resultSummary(attemptId, result);
});

const calculateSectionedResult = (answers: any[], sections: any[], answerQuestionKey: string, answerSectionKey: string) => {
  const answerByQuestion = new Map(answers.map((answer) => [answer[answerQuestionKey], answer]));
  const sectionResults = new Map<string, { score: number; correct: number; incorrect: number; unattempted: number }>();
  const answerResults: { id: string; status: AnswerStatus; marks: number; sectionId: string; question: any }[] = [];
  let score = 0, correct = 0, incorrect = 0, unattempted = 0;
  for (const section of sections) {
    const sectionStat = { score: 0, correct: 0, incorrect: 0, unattempted: 0 };
    for (const question of section.questions) {
      const answer = answerByQuestion.get(question.id);
      const result = scoreAnswer(answer?.selectedAnswers ?? [], question.correctAnswers, question.questionType, toNumber(question.positiveMarks), toNumber(question.negativeMarks));
      answerResults.push({ id: answer.id, status: result.status, marks: result.marks, sectionId: answer[answerSectionKey], question });
      score += result.marks;
      sectionStat.score += result.marks;
      if (result.status === AnswerStatus.CORRECT) { correct++; sectionStat.correct++; }
      else if (result.status === AnswerStatus.UNATTEMPTED) { unattempted++; sectionStat.unattempted++; }
      else { incorrect++; sectionStat.incorrect++; }
    }
    sectionResults.set(section.id, sectionStat);
  }
  return { score, correct, incorrect, unattempted, accuracy: accuracy(correct, incorrect), sectionResults, answerResults };
};

const calculateFlatResult = (answers: any[], questions: any[], answerQuestionKey: string) => {
  const answerByQuestion = new Map(answers.map((answer) => [answer[answerQuestionKey], answer]));
  const answerResults: { id: string; status: AnswerStatus; marks: number; question: any }[] = [];
  let score = 0, correct = 0, incorrect = 0, unattempted = 0;
  for (const question of questions) {
    const answer = answerByQuestion.get(question.id);
    const result = scoreAnswer(answer?.selectedAnswers ?? [], question.correctAnswers, question.questionType, toNumber(question.positiveMarks), toNumber(question.negativeMarks));
    answerResults.push({ id: answer.id, status: result.status, marks: result.marks, question });
    score += result.marks;
    if (result.status === AnswerStatus.CORRECT) correct++;
    else if (result.status === AnswerStatus.UNATTEMPTED) unattempted++;
    else incorrect++;
  }
  return { score, correct, incorrect, unattempted, accuracy: accuracy(correct, incorrect), answerResults };
};

const attemptUpdate = (input: SubmitInput, result: any, startedAt: Date, durationMinutes: number, submittedAt: Date) => ({
  status: input.autoSubmitted ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED,
  submittedAt,
  timeTakenSeconds: elapsed(startedAt, durationMinutes, submittedAt),
  marksScored: result.score,
  correctAnswers: result.correct,
  incorrectAnswers: result.incorrect,
  unattemptedAnswers: result.unattempted,
  accuracy: result.accuracy,
});

const flatAttemptUpdate = (result: any, startedAt: Date, durationMinutes: number, submittedAt: Date) => ({
  submittedAt,
  timeTakenSeconds: elapsed(startedAt, durationMinutes, submittedAt),
  marksScored: result.score,
  correctAnswers: result.correct,
  incorrectAnswers: result.incorrect,
  unattemptedAnswers: result.unattempted,
  accuracy: result.accuracy,
});

const elapsed = (startedAt: Date, durationMinutes: number, now: Date) => Math.min(durationMinutes * 60, Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000)));
const resultSummary = (attemptId: string, result: any) => ({ attemptId, score: result.score, correct: result.correct, incorrect: result.incorrect, unattempted: result.unattempted, accuracy: result.accuracy });

const updateMockAnswerRows = (tx: Prisma.TransactionClient, rows: any[]) => Promise.all(rows.map((row) => tx.mockAttemptAnswer.update({ where: { id: row.id }, data: { status: row.status, marksAwarded: row.marks } })));
const updateContentAnswerRows = (tx: Prisma.TransactionClient, rows: any[]) => Promise.all(rows.map((row) => tx.contentAttemptAnswer.update({ where: { id: row.id }, data: { status: row.status, marksAwarded: row.marks } })));
const updateBatchAnswerRows = (tx: Prisma.TransactionClient, rows: any[]) => Promise.all(rows.map((row) => tx.batchAttemptAnswer.update({ where: { id: row.id }, data: { status: row.status, marksAwarded: row.marks } })));
const updateRcAnswerRows = (tx: Prisma.TransactionClient, rows: any[]) => Promise.all(rows.map((row) => tx.rcAttemptAnswer.update({ where: { id: row.id }, data: { status: row.status, marksAwarded: row.marks } })));

const updateMockSectionRows = (tx: Prisma.TransactionClient, attemptId: string, sections: Map<string, any>, times: SubmitInput['sectionTimes']) => Promise.all([...sections.entries()].map(([sectionId, stat]) => tx.mockAttemptSection.update({ where: { mockAttemptId_mockSectionId: { mockAttemptId: attemptId, mockSectionId: sectionId } }, data: sectionAttemptData(stat, sectionId, times) })));
const updateContentSectionRows = (tx: Prisma.TransactionClient, attemptId: string, sections: Map<string, any>, times: SubmitInput['sectionTimes']) => Promise.all([...sections.entries()].map(([sectionId, stat]) => tx.contentAttemptSection.update({ where: { contentAttemptId_contentSectionId: { contentAttemptId: attemptId, contentSectionId: sectionId } }, data: sectionAttemptData(stat, sectionId, times) })));
const updateBatchSectionRows = (tx: Prisma.TransactionClient, attemptId: string, sections: Map<string, any>, times: SubmitInput['sectionTimes']) => Promise.all([...sections.entries()].map(([sectionId, stat]) => tx.batchAttemptSection.update({ where: { batchAttemptId_batchSectionId: { batchAttemptId: attemptId, batchSectionId: sectionId } }, data: sectionAttemptData(stat, sectionId, times) })));

const sectionAttemptData = (stat: any, sectionId: string, times: SubmitInput['sectionTimes']) => ({
  timeTakenSeconds: times.find((time) => time.sectionId === sectionId)?.timeTakenSeconds ?? 0,
  marksScored: stat.score,
  correctAnswers: stat.correct,
  incorrectAnswers: stat.incorrect,
  unattemptedAnswers: stat.unattempted,
  accuracy: accuracy(stat.correct, stat.incorrect),
});

const recalcMockAnalytics = async (tx: Prisma.TransactionClient, mockExamId: string) => {
  const attempts = await tx.mockAttempt.findMany({ where: { mockExamId, status: { in: submittedStatuses } }, orderBy: [{ marksScored: 'desc' }, { timeTakenSeconds: 'asc' }, { submittedAt: 'asc' }] });
  await updateMockRanks(tx, attempts);
  const refreshed = await tx.mockAttempt.findMany({ where: { mockExamId, status: { in: submittedStatuses } } });
  const total = refreshed.length;
  await tx.mockAttemptAnalytics.upsert({
    where: { mockExamId },
    create: { mockExamId, ...attemptAnalyticsData(refreshed) },
    update: attemptAnalyticsData(refreshed),
  });
  const sections = await tx.mockSection.findMany({ where: { mockExamId }, select: { id: true } });
  await Promise.all(sections.map(async (section) => {
    const rows = await tx.mockAttemptSection.findMany({ where: { mockSectionId: section.id, mockAttempt: { status: { in: submittedStatuses } } } });
    await tx.mockSectionAnalytics.upsert({ where: { mockSectionId: section.id }, create: { mockSectionId: section.id, ...sectionAnalyticsData(rows) }, update: sectionAnalyticsData(rows) });
  }));
  return total;
};

const updateMockRanks = async (tx: Prisma.TransactionClient, attempts: any[]) => {
  let previousScore: number | null = null;
  let previousRank = 0;
  const total = attempts.length;
  await Promise.all(attempts.map((attempt, index) => {
    const score = toNumber(attempt.marksScored);
    const rank = previousScore === score ? previousRank : index + 1;
    previousScore = score;
    previousRank = rank;
    return tx.mockAttempt.update({ where: { id: attempt.id }, data: { rank, percentile: total ? Number((((total - rank + 1) / total) * 100).toFixed(2)) : 0 } });
  }));
};

const recalcBatchAnalytics = async (tx: Prisma.TransactionClient, batchTestId: string) => {
  const attempts = await tx.batchAttempt.findMany({ where: { batchTestId, status: { in: submittedStatuses } } });
  await tx.batchTestAnalytics.upsert({
    where: { batchTestId },
    create: { batchTestId, ...batchTestAnalyticsData(attempts) },
    update: batchTestAnalyticsData(attempts),
  });
  const sections = await tx.batchSection.findMany({ where: { batchTestId } });
  await Promise.all(sections.map(async (section) => {
    const rows = await tx.batchAttemptSection.findMany({ where: { batchSectionId: section.id, batchAttempt: { status: { in: submittedStatuses } } } });
    await tx.batchSectionAnalytics.upsert({ where: { batchSectionId: section.id }, create: { batchSectionId: section.id, ...batchSectionAnalyticsData(rows) }, update: batchSectionAnalyticsData(rows) });
  }));
};

const recalcRcAnalytics = async (tx: Prisma.TransactionClient, rcTestId: string) => {
  const attempts = await tx.rcAttempt.findMany({ where: { rcTestId, submittedAt: { not: null } } });
  await tx.rcTestAnalytics.upsert({ where: { rcTestId }, create: { rcTestId, ...simpleTestAnalyticsData(attempts) }, update: simpleTestAnalyticsData(attempts) });
};

const recalcRcLeaderboard = async (tx: Prisma.TransactionClient, studentId: string) => {
  const attempts = await tx.rcAttempt.findMany({ where: { studentId, submittedAt: { not: null } }, orderBy: { submittedAt: 'asc' } });
  const submittedTimes = attempts.map((attempt) => attempt.submittedAt!).filter(Boolean);
  let currentStreak = 0;
  let highestStreak = 0;
  let previous: Date | null = null;
  for (const submittedAt of submittedTimes) {
    if (!previous || submittedAt.getTime() - previous.getTime() <= rcStreakGraceMs) currentStreak += 1;
    else currentStreak = 1;
    highestStreak = Math.max(highestStreak, currentStreak);
    previous = submittedAt;
  }
  const averageScore = average(attempts.map((attempt) => toNumber(attempt.marksScored)));
  const lastCompletedAt = submittedTimes.length ? submittedTimes[submittedTimes.length - 1] : null;
  const lastCompletedDate = lastCompletedAt ? new Date(`${lastCompletedAt.toISOString().slice(0, 10)}T00:00:00Z`) : null;
  await tx.rcLeaderboard.upsert({
    where: { studentId },
    create: { studentId, currentStreak, highestStreak, totalRcAttempted: attempts.length, averageScore, lastCompletedDate, lastCompletedAt },
    update: { currentStreak, highestStreak, totalRcAttempted: attempts.length, averageScore, lastCompletedDate, lastCompletedAt },
  });
};

const rcStreakGraceMs = 30 * 60 * 60 * 1000;

const attemptAnalyticsData = (attempts: any[]) => ({
  totalAttempts: attempts.length,
  averageScore: average(attempts.map((attempt) => toNumber(attempt.marksScored))),
  averageAccuracy: average(attempts.map((attempt) => toNumber(attempt.accuracy))),
  averageTimeTaken: Math.round(average(attempts.map((attempt) => attempt.timeTakenSeconds))),
  averageRank: average(attempts.map((attempt) => attempt.rank ?? 0)),
  averagePercentile: average(attempts.map((attempt) => toNumber(attempt.percentile))),
  totalCorrectAnswers: sum(attempts.map((attempt) => attempt.correctAnswers)),
  totalIncorrectAnswers: sum(attempts.map((attempt) => attempt.incorrectAnswers)),
  totalUnattemptedAnswers: sum(attempts.map((attempt) => attempt.unattemptedAnswers)),
});

const sectionAnalyticsData = (rows: any[]) => ({
  totalAttempts: rows.length,
  averageScore: average(rows.map((row) => toNumber(row.marksScored))),
  averageAccuracy: average(rows.map((row) => toNumber(row.accuracy))),
  averageTimeTaken: Math.round(average(rows.map((row) => row.timeTakenSeconds))),
  totalCorrectAnswers: sum(rows.map((row) => row.correctAnswers)),
  totalIncorrectAnswers: sum(rows.map((row) => row.incorrectAnswers)),
  totalUnattemptedAnswers: sum(rows.map((row) => row.unattemptedAnswers)),
});

const batchTestAnalyticsData = (attempts: any[]) => ({
  totalAttempts: attempts.length,
  uniqueStudentsAttempted: new Set(attempts.map((attempt) => attempt.studentId)).size,
  averageScore: average(attempts.map((attempt) => toNumber(attempt.marksScored))),
  highestScore: attempts.length ? Math.max(...attempts.map((attempt) => toNumber(attempt.marksScored))) : 0,
  lowestScore: attempts.length ? Math.min(...attempts.map((attempt) => toNumber(attempt.marksScored))) : 0,
  averageAccuracy: average(attempts.map((attempt) => toNumber(attempt.accuracy))),
  averageTimeTakenSeconds: Math.round(average(attempts.map((attempt) => attempt.timeTakenSeconds))),
  averagePercentile: 0,
  lastAttemptAt: attempts.reduce<Date | null>((latest, attempt) => !latest || (attempt.submittedAt && attempt.submittedAt > latest) ? attempt.submittedAt : latest, null),
});

const batchSectionAnalyticsData = (rows: any[]) => ({
  totalAttempts: rows.length,
  averageScore: average(rows.map((row) => toNumber(row.marksScored))),
  highestScore: rows.length ? Math.max(...rows.map((row) => toNumber(row.marksScored))) : 0,
  lowestScore: rows.length ? Math.min(...rows.map((row) => toNumber(row.marksScored))) : 0,
  averageAccuracy: average(rows.map((row) => toNumber(row.accuracy))),
  averageTimeTakenSeconds: Math.round(average(rows.map((row) => row.timeTakenSeconds))),
  totalCorrectAnswers: sum(rows.map((row) => row.correctAnswers)),
  totalIncorrectAnswers: sum(rows.map((row) => row.incorrectAnswers)),
  totalUnattemptedAnswers: sum(rows.map((row) => row.unattemptedAnswers)),
});

const simpleTestAnalyticsData = (attempts: any[]) => ({
  totalAttempts: attempts.length,
  uniqueStudentsAttempted: new Set(attempts.map((attempt) => attempt.studentId)).size,
  averageScore: average(attempts.map((attempt) => toNumber(attempt.marksScored))),
  highestScore: attempts.length ? Math.max(...attempts.map((attempt) => toNumber(attempt.marksScored))) : 0,
  lowestScore: attempts.length ? Math.min(...attempts.map((attempt) => toNumber(attempt.marksScored))) : 0,
  averageAccuracy: average(attempts.map((attempt) => toNumber(attempt.accuracy))),
  averageTimeTakenSeconds: Math.round(average(attempts.map((attempt) => attempt.timeTakenSeconds))),
});

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const average = (values: number[]) => values.length ? Number((sum(values) / values.length).toFixed(2)) : 0;
