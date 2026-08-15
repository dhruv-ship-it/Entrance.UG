import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';

const toNumber = (value: unknown) => Number(value ?? 0);
const rcStreakGraceMs = 30 * 60 * 60 * 1000;

const phaseFor = (start: Date, end: Date) => {
  const current = new Date();
  if (start > current) return 'UPCOMING' as const;
  if (end < current) return 'PAST' as const;
  return 'LIVE' as const;
};

const questionCount = { questions: true } as const;

const mapTestSummary = (test: any) => {
  const attempt = test.attempts?.[0] ?? null;
  return {
    id: test.id,
    title: test.title,
    instructions: test.instructions,
    startDatetime: test.startDatetime,
    endDatetime: test.endDatetime,
    durationMinutes: test.durationMinutes,
    totalMarks: toNumber(test.totalMarks),
    difficulty: test.difficulty.name,
    questionCount: test._count?.questions ?? 0,
    phase: phaseFor(test.startDatetime, test.endDatetime),
    attempted: Boolean(attempt),
    latestAttempt: attempt ? {
      id: attempt.id,
      submittedAt: attempt.submittedAt,
      marksScored: toNumber(attempt.marksScored),
      accuracy: toNumber(attempt.accuracy),
    } : null,
    analytics: test.analytics ? {
      totalAttempts: test.analytics.totalAttempts,
      uniqueStudentsAttempted: test.analytics.uniqueStudentsAttempted,
      averageScore: toNumber(test.analytics.averageScore),
      highestScore: toNumber(test.analytics.highestScore),
      lowestScore: toNumber(test.analytics.lowestScore),
      averageAccuracy: toNumber(test.analytics.averageAccuracy),
      averageTimeTakenSeconds: test.analytics.averageTimeTakenSeconds,
    } : null,
  };
};

export const dashboard = async (studentId: string) => {
  const current = new Date();
  const [activeTests, recentAttempts, leaderboard, allLeaderboard] = await Promise.all([
    prisma.rcTest.findMany({
      where: { isActive: true, startDatetime: { lte: current }, endDatetime: { gte: current } },
      orderBy: { endDatetime: 'asc' },
      take: 4,
      include: {
        difficulty: { select: { name: true } },
        analytics: true,
        attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: questionCount },
      },
    }),
    prisma.rcAttempt.findMany({
      where: { studentId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      take: 4,
      include: { rcTest: { include: { analytics: true, difficulty: { select: { name: true } }, _count: { select: questionCount } } } },
    }),
    prisma.rcLeaderboard.findUnique({
      where: { studentId },
      include: { student: { select: { id: true, name: true, profileImage: true } } },
    }),
    prisma.rcLeaderboard.findMany({
      orderBy: [{ currentStreak: 'desc' }, { averageScore: 'desc' }, { studentId: 'asc' }],
      take: 100,
      include: { student: { select: { id: true, name: true, profileImage: true } } },
    }),
  ]);

  const trendAttempts = await prisma.rcAttempt.findMany({
    where: { studentId, submittedAt: { not: null } },
    orderBy: { submittedAt: 'asc' },
    take: 12,
    include: { rcTest: { include: { analytics: true } } },
  });

  return {
    activeTests: activeTests.map(mapTestSummary),
    recentAttempts: recentAttempts.map(mapAttemptSummary),
    leaderboard: rankLeaderboard(allLeaderboard, studentId),
    myLeaderboard: leaderboard ? mapLeaderboardEntry(leaderboard, 1) : null,
    scoreTrend: trendAttempts.map((attempt) => ({
      attemptId: attempt.id,
      testTitle: attempt.rcTest.title,
      submittedAt: attempt.submittedAt,
      score: toNumber(attempt.marksScored),
      averageScore: toNumber(attempt.rcTest.analytics?.averageScore),
    })),
  };
};

export const tests = async (studentId: string) => {
  const rows = await prisma.rcTest.findMany({
    where: { isActive: true },
    orderBy: [{ startDatetime: 'desc' }],
    include: {
      difficulty: { select: { name: true } },
      analytics: true,
      attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: questionCount },
    },
  });
  return rows.map(mapTestSummary);
};

export const testDetail = async (studentId: string, testId: string) => {
  const test = await prisma.rcTest.findFirst({
    where: { id: testId, isActive: true },
    include: {
      difficulty: { select: { name: true, description: true } },
      analytics: true,
      questions: { orderBy: { sequenceNumber: 'asc' }, select: { id: true, sequenceNumber: true, questionType: true, positiveMarks: true, negativeMarks: true } },
      attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!test) throw new AppError(404, 'RC test not found.');
  return {
    id: test.id,
    title: test.title,
    passage: test.passage,
    instructions: test.instructions,
    startDatetime: test.startDatetime,
    endDatetime: test.endDatetime,
    durationMinutes: test.durationMinutes,
    totalMarks: toNumber(test.totalMarks),
    difficulty: test.difficulty,
    phase: phaseFor(test.startDatetime, test.endDatetime),
    attempted: Boolean(test.attempts[0]),
    latestAttemptId: test.attempts[0]?.id ?? null,
    questions: test.questions.map((question) => ({
      id: question.id,
      sequenceNumber: question.sequenceNumber,
      questionType: question.questionType,
      positiveMarks: toNumber(question.positiveMarks),
      negativeMarks: toNumber(question.negativeMarks),
    })),
    analytics: test.analytics ? {
      totalAttempts: test.analytics.totalAttempts,
      uniqueStudentsAttempted: test.analytics.uniqueStudentsAttempted,
      averageScore: toNumber(test.analytics.averageScore),
      highestScore: toNumber(test.analytics.highestScore),
      lowestScore: toNumber(test.analytics.lowestScore),
      averageAccuracy: toNumber(test.analytics.averageAccuracy),
      averageTimeTakenSeconds: test.analytics.averageTimeTakenSeconds,
    } : null,
  };
};

export const attempts = async (studentId: string) => {
  const rows = await prisma.rcAttempt.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: { rcTest: { include: { difficulty: { select: { name: true } }, analytics: true, _count: { select: questionCount } } } },
  });
  return rows.map(mapAttemptSummary);
};

export const attemptDetail = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.rcAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      rcTest: { include: { analytics: true, difficulty: { select: { name: true } } } },
      answers: {
        orderBy: { rcQuestion: { sequenceNumber: 'asc' } },
        include: { rcQuestion: true },
      },
    },
  });
  if (!attempt) throw new AppError(404, 'RC attempt not found.');
  return {
    ...mapAttemptSummary(attempt),
    test: {
      id: attempt.rcTest.id,
      title: attempt.rcTest.title,
      passage: attempt.rcTest.passage,
      difficulty: attempt.rcTest.difficulty.name,
      analytics: attempt.rcTest.analytics ? {
        averageScore: toNumber(attempt.rcTest.analytics.averageScore),
        highestScore: toNumber(attempt.rcTest.analytics.highestScore),
        averageAccuracy: toNumber(attempt.rcTest.analytics.averageAccuracy),
      } : null,
    },
    answers: attempt.answers.map((answer) => ({
      id: answer.id,
      questionNumber: answer.rcQuestion.sequenceNumber,
      question: answer.rcQuestion.question,
      options: answer.rcQuestion.options,
      selectedAnswers: answer.selectedAnswers,
      correctAnswers: answer.correctAnswers,
      status: answer.status,
      marksAwarded: toNumber(answer.marksAwarded),
      timeTakenSeconds: answer.timeTakenSeconds,
      explanation: answer.rcQuestion.explanation,
    })),
  };
};

const mapAttemptSummary = (attempt: any) => ({
  id: attempt.id,
  startedAt: attempt.startedAt,
  submittedAt: attempt.submittedAt,
  timeTakenSeconds: attempt.timeTakenSeconds,
  totalMarks: toNumber(attempt.totalMarks),
  marksScored: toNumber(attempt.marksScored),
  correctAnswers: attempt.correctAnswers,
  incorrectAnswers: attempt.incorrectAnswers,
  unattemptedAnswers: attempt.unattemptedAnswers,
  accuracy: toNumber(attempt.accuracy),
  test: {
    id: attempt.rcTest.id,
    title: attempt.rcTest.title,
    difficulty: attempt.rcTest.difficulty?.name,
    questionCount: attempt.rcTest._count?.questions,
    averageScore: toNumber(attempt.rcTest.analytics?.averageScore),
  },
});

const mapLeaderboardEntry = (entry: any, rank: number) => ({
  rank,
  id: entry.id,
  studentId: entry.studentId,
  currentStreak: effectiveCurrentStreak(entry),
  storedCurrentStreak: entry.currentStreak,
  highestStreak: entry.highestStreak,
  totalRcAttempted: entry.totalRcAttempted,
  averageScore: toNumber(entry.averageScore),
  lastCompletedDate: entry.lastCompletedDate,
  lastCompletedAt: entry.lastCompletedAt ?? entry.lastCompletedDate,
  streakExpiresAt: streakExpiresAt(entry),
  student: entry.student,
});

const rankLeaderboard = (rows: any[], currentStudentId: string) => {
  let lastKey = '';
  let rank = 0;
  return rows
    .map((row) => ({ ...row, effectiveCurrentStreak: effectiveCurrentStreak(row) }))
    .sort((left, right) => (
      right.effectiveCurrentStreak - left.effectiveCurrentStreak
      || toNumber(right.averageScore) - toNumber(left.averageScore)
      || String(left.studentId).localeCompare(String(right.studentId))
    ))
    .slice(0, 20)
    .map((row, index) => {
    const key = `${row.effectiveCurrentStreak}-${toNumber(row.averageScore)}`;
    if (key !== lastKey) rank = index + 1;
    lastKey = key;
    return { ...mapLeaderboardEntry(row, rank), isCurrentStudent: row.studentId === currentStudentId };
  });
};

const effectiveCurrentStreak = (entry: any) => {
  const lastCompletedAt = lastCompletionTime(entry);
  if (!lastCompletedAt) return 0;
  return Date.now() - lastCompletedAt.getTime() <= rcStreakGraceMs ? entry.currentStreak : 0;
};

const streakExpiresAt = (entry: any) => {
  const lastCompletedAt = lastCompletionTime(entry);
  return lastCompletedAt ? new Date(lastCompletedAt.getTime() + rcStreakGraceMs) : null;
};

const lastCompletionTime = (entry: any) => {
  const value = entry.lastCompletedAt ?? entry.lastCompletedDate;
  return value ? new Date(value) : null;
};
