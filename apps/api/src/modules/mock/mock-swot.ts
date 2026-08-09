import { AnswerStatus, AttemptStatus, Prisma } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';

type SwotItem = {
  title: string;
  description: string;
  metric: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
};

const submittedStatuses: AttemptStatus[] = [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED];
const n = (value: unknown) => value == null ? 0 : typeof value === 'number' ? value : Number(value);
const pct = (num: number, den: number) => den ? Number(((num / den) * 100).toFixed(1)) : 0;
const round = (value: number) => Number(value.toFixed(2));
const priority = (value: number, high = 70, medium = 45): SwotItem['priority'] => value >= high ? 'HIGH' : value >= medium ? 'MEDIUM' : 'LOW';

const item = (title: string, description: string, metric: string, priorityValue: SwotItem['priority'] = 'MEDIUM'): SwotItem => ({ title, description, metric, priority: priorityValue });
const evidenceThreshold = (totalQuestions: number) => totalQuestions <= 20 ? 2 : Math.max(2, Math.ceil(totalQuestions * 0.08));
const hasEvidence = (row: PerformanceRow | undefined, totalQuestions: number) => Boolean(row && row.total >= evidenceThreshold(totalQuestions));
const isStrongCluster = (row: PerformanceRow | undefined, totalQuestions: number) => Boolean(row && hasEvidence(row, totalQuestions) && row.correctShare >= 80 && row.accuracy >= 80 && row.incorrect === 0);
const isOpportunityCluster = (row: PerformanceRow | undefined, totalQuestions: number) => Boolean(row && hasEvidence(row, totalQuestions) && row.accuracy >= 70 && row.unattemptedShare >= 25 && row.correct > 0);
const isWeakCluster = (row: PerformanceRow | undefined, totalQuestions: number) => Boolean(row && hasEvidence(row, totalQuestions) && (row.accuracy < 55 || row.incorrectShare >= 40));

type PerformanceRow = {
  name: string;
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  attempted: number;
  accuracy: number;
  correctShare: number;
  incorrectShare: number;
  unattemptedShare: number;
};

export const upsertMockAttemptSwotAnalysis = async (tx: Prisma.TransactionClient, attemptId: string) => {
  const attempt = await tx.mockAttempt.findUnique({
    where: { id: attemptId },
    include: mockSwotInclude,
  });
  if (!attempt || !submittedStatuses.includes(attempt.status)) return null;
  const payload = buildMockSwotPayload(attempt);
  return tx.mockAttemptSwotAnalysis.upsert({
    where: { mockAttemptId: attemptId },
    create: { mockAttemptId: attemptId, ...payload },
    update: { ...payload, generatedAt: new Date() },
  });
};

export const getOrCreateMockAttemptSwotAnalysis = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.mockAttempt.findFirst({
    where: { id: attemptId, studentId, status: { in: submittedStatuses } },
    select: { id: true },
  });
  if (!attempt) throw new AppError(404, 'SWOT analysis is unavailable for this attempt.');
  const created = await prisma.$transaction((tx) => upsertMockAttemptSwotAnalysis(tx, attemptId));
  if (!created) throw new AppError(404, 'SWOT analysis could not be generated.');
  return mapSwot(created);
};

const mockSwotInclude = {
  mockExam: {
    include: {
      sections: {
        orderBy: { sequenceNumber: 'asc' as const },
        include: {
          mockSectionType: { select: { name: true } },
          questions: {
            where: { isActive: true },
            include: {
              topic: { include: { subject: true } },
              subtopic: true,
              difficulty: true,
            },
          },
        },
      },
    },
  },
  sections: { include: { mockSection: { include: { mockSectionType: true } } } },
  answers: {
    include: {
      mockQuestion: {
        include: {
          topic: { include: { subject: true } },
          subtopic: true,
          difficulty: true,
          mockSection: { include: { mockSectionType: true } },
        },
      },
    },
  },
} satisfies Prisma.MockAttemptInclude;

const buildMockSwotPayload = (attempt: Prisma.MockAttemptGetPayload<{ include: typeof mockSwotInclude }>) => {
  const totalQuestions = attempt.answers.length;
  const correct = attempt.correctAnswers;
  const incorrect = attempt.incorrectAnswers;
  const unattempted = attempt.unattemptedAnswers;
  const accuracy = n(attempt.accuracy);
  const score = n(attempt.marksScored);
  const totalMarks = n(attempt.totalMarks);
  const scorePercent = pct(score, totalMarks);
  const timePercent = pct(attempt.timeTakenSeconds, attempt.mockExam.durationMinutes * 60);
  const sections = attempt.sections.map((section) => ({
    name: section.mockSection.name || section.mockSection.mockSectionType.name,
    accuracy: n(section.accuracy),
    score: n(section.marksScored),
    correct: section.correctAnswers,
    incorrect: section.incorrectAnswers,
    unattempted: section.unattemptedAnswers,
    total: section.correctAnswers + section.incorrectAnswers + section.unattemptedAnswers,
    time: section.timeTakenSeconds,
  })).map((section) => ({
    ...section,
    attempted: section.correct + section.incorrect,
    correctShare: pct(section.correct, section.total),
    incorrectShare: pct(section.incorrect, section.total),
    unattemptedShare: pct(section.unattempted, section.total),
  }));
  const topicRows = groupedPerformance(attempt.answers, (answer) => answer.mockQuestion.topic.name);
  const subjectRows = groupedPerformance(attempt.answers, (answer) => answer.mockQuestion.topic.subject?.name ?? 'General');
  const difficultyRows = groupedPerformance(attempt.answers, (answer) => answer.mockQuestion.difficulty.name);
  const bestSection = [...sections].filter((row) => row.total >= evidenceThreshold(totalQuestions) && row.correctShare >= 70 && row.accuracy >= 80 && row.incorrectShare <= 15).sort((a, b) => b.correctShare - a.correctShare || b.accuracy - a.accuracy)[0];
  const sectionOpportunity = [...sections].filter((row) => row.total >= evidenceThreshold(totalQuestions) && row.accuracy >= 75 && row.unattemptedShare >= 25 && row.correct > 0).sort((a, b) => b.unattemptedShare - a.unattemptedShare || b.accuracy - a.accuracy)[0];
  const weakestSection = [...sections].filter((row) => row.total >= evidenceThreshold(totalQuestions) && (row.accuracy < 55 || row.incorrectShare >= 35)).sort((a, b) => a.accuracy - b.accuracy || b.incorrectShare - a.incorrectShare)[0];
  const bestTopic = [...topicRows].filter((row) => isStrongCluster(row, totalQuestions)).sort((a, b) => b.correctShare - a.correctShare || b.correct - a.correct)[0];
  const bestSubject = [...subjectRows].filter((row) => isStrongCluster(row, totalQuestions) || (hasEvidence(row, totalQuestions) && row.correctShare >= 75 && row.accuracy >= 80)).sort((a, b) => b.correctShare - a.correctShare || b.correct - a.correct)[0];
  const topicOpportunity = [...topicRows].filter((row) => isOpportunityCluster(row, totalQuestions)).sort((a, b) => b.unattemptedShare - a.unattemptedShare || b.correctShare - a.correctShare)[0];
  const subjectOpportunity = [...subjectRows].filter((row) => isOpportunityCluster(row, totalQuestions)).sort((a, b) => b.unattemptedShare - a.unattemptedShare || b.correctShare - a.correctShare)[0];
  const weakestTopic = [...topicRows].filter((row) => isWeakCluster(row, totalQuestions)).sort((a, b) => a.accuracy - b.accuracy || b.incorrectShare - a.incorrectShare)[0];
  const partialTopic = [...topicRows].filter((row) => hasEvidence(row, totalQuestions) && !isStrongCluster(row, totalQuestions) && !isWeakCluster(row, totalQuestions) && row.correct > 0).sort((a, b) => b.total - a.total || b.unattempted - a.unattempted)[0];
  const weakestDifficulty = [...difficultyRows].filter((row) => hasEvidence(row, totalQuestions) || row.total >= 2).sort((a, b) => a.accuracy - b.accuracy || b.incorrect + b.unattempted - (a.incorrect + a.unattempted))[0];

  const strengths: SwotItem[] = [];
  const weaknesses: SwotItem[] = [];
  const opportunities: SwotItem[] = [];
  const threats: SwotItem[] = [];

  if (scorePercent >= 60) strengths.push(item('Healthy score base', `You scored ${score}/${totalMarks}, which gives you a strong base to build from.`, `${scorePercent}% score`, priority(scorePercent)));
  if (accuracy >= 65) strengths.push(item('Reliable accuracy', 'Your attempted-question accuracy is strong, so scaling attempts can improve score without changing fundamentals.', `${accuracy}% accuracy`, priority(accuracy)));
  if (bestSection) strengths.push(item(`Strong section: ${bestSection.name}`, `This section shows a clean scoring pattern with high accuracy and very little negative leakage.`, `${bestSection.correct}/${bestSection.total} correct`, priority(bestSection.accuracy)));
  if (bestTopic) strengths.push(item(`Topic strength: ${bestTopic.name}`, `This topic has a clear high-quality signal in this paper, so keep it protected while improving weaker areas.`, `${bestTopic.correct}/${bestTopic.total} correct`, priority(bestTopic.correctShare)));
  if (!bestTopic && bestSubject) strengths.push(item(`Subject strength: ${bestSubject.name}`, `At subject level, this was one of your cleaner scoring zones in the attempt.`, `${bestSubject.correct}/${bestSubject.total} correct`, priority(bestSubject.correctShare)));
  if (!strengths.length) strengths.push(item('Clear baseline captured', 'Even if the score is not high yet, this attempt gives enough evidence to plan focused improvement.', `${totalQuestions} questions analyzed`, 'MEDIUM'));

  if (accuracy < 55) weaknesses.push(item('Accuracy needs attention', 'Incorrect answers are reducing your score. Review why wrong options felt attractive.', `${accuracy}% accuracy`, accuracy < 40 ? 'HIGH' : 'MEDIUM'));
  if (weakestSection) weaknesses.push(item(`Weak section: ${weakestSection.name}`, 'This section needs a targeted revision and timed practice block.', `${weakestSection.accuracy}% accuracy`, weakestSection.accuracy < 40 ? 'HIGH' : 'MEDIUM'));
  if (weakestTopic) weaknesses.push(item(`Topic gap: ${weakestTopic.name}`, 'This topic created avoidable loss or uncertainty in the attempt.', `${weakestTopic.incorrect} wrong, ${weakestTopic.unattempted} skipped`, weakestTopic.accuracy < 40 ? 'HIGH' : 'MEDIUM'));
  if (incorrect > correct) weaknesses.push(item('Wrong answers outweighed correct answers', 'The attempt pattern suggests guessing or concept confusion in multiple places.', `${incorrect} incorrect vs ${correct} correct`, 'HIGH'));
  if (!weaknesses.length) weaknesses.push(item('Fine-tune weaker pockets', 'No severe weakness stands out, so focus on converting medium-confidence questions.', `${incorrect + unattempted} questions to review`, 'LOW'));

  if (sectionOpportunity) opportunities.push(item(`Attempt more in ${sectionOpportunity.name}`, `You were accurate when you attempted this section, but left score on the table through unattempted questions.`, `${sectionOpportunity.accuracy}% accuracy, ${sectionOpportunity.unattempted} skipped`, sectionOpportunity.unattemptedShare >= 40 ? 'HIGH' : 'MEDIUM'));
  if (weakestTopic) opportunities.push(item(`Revise ${weakestTopic.name}`, 'Revise basics, then solve a short topic drill before the next mock.', `${weakestTopic.total} questions in this mock`, 'HIGH'));
  if (!weakestTopic && topicOpportunity) opportunities.push(item(`Attempt more in ${topicOpportunity.name}`, 'You answered this topic accurately when attempted, so the next gain is coverage rather than concept relearning.', `${topicOpportunity.correct}/${topicOpportunity.total} correct, ${topicOpportunity.unattempted} skipped`, 'MEDIUM'));
  if (!topicOpportunity && subjectOpportunity) opportunities.push(item(`Expand coverage in ${subjectOpportunity.name}`, 'At subject level, accuracy was promising but skipped questions kept the score capped.', `${subjectOpportunity.accuracy}% accuracy`, 'MEDIUM'));
  if (!weakestTopic && partialTopic) opportunities.push(item(`Push ${partialTopic.name} higher`, 'This topic is not weak enough to be a red flag, but it has enough mixed evidence to become a quick improvement area.', `${partialTopic.correct}/${partialTopic.total} correct`, 'MEDIUM'));
  if (weakestDifficulty) opportunities.push(item(`Practice ${weakestDifficulty.name.toLowerCase()} difficulty`, 'Your next practice set should include this difficulty band with solution review.', `${weakestDifficulty.accuracy}% accuracy`, weakestDifficulty.accuracy < 50 ? 'HIGH' : 'MEDIUM'));
  if (unattempted > 0) opportunities.push(item('Convert skipped questions', 'Start with skipped questions that came from familiar topics; these are often the fastest score gains.', `${unattempted} skipped`, pct(unattempted, totalQuestions) > 25 ? 'HIGH' : 'MEDIUM'));
  const smallSampleCorrectTopic = [...topicRows].filter((row) => row.total < evidenceThreshold(totalQuestions) && row.correct > 0 && row.correctShare >= 50).sort((a, b) => b.correctShare - a.correctShare)[0];
  if (smallSampleCorrectTopic) opportunities.push(item(`Validate ${smallSampleCorrectTopic.name}`, 'You got some of this topic right, but there were too few questions to call it a strength yet. Confirm it with more practice.', `${smallSampleCorrectTopic.correct}/${smallSampleCorrectTopic.total} correct`, 'LOW'));
  opportunities.push(item('Use the answer review page', 'Bookmark 5-10 questions from this attempt and revisit them before the next mock.', `${incorrect + unattempted} review candidates`, 'MEDIUM'));

  if (incorrect > 0) threats.push(item('Negative marking leakage', 'Repeated wrong attempts can erase gains from correct answers. Improve elimination before attempting doubtful questions.', `${incorrect} incorrect`, incorrect >= correct ? 'HIGH' : 'MEDIUM'));
  if (timePercent >= 90) threats.push(item('Time pressure risk', 'You used almost the full allotted time. Under tougher papers, this can increase skipped or rushed answers.', `${round(timePercent)}% time used`, 'MEDIUM'));
  if (pct(unattempted, totalQuestions) >= 25) threats.push(item('Coverage risk', 'A high skipped-question share can cap your score even when accuracy is decent.', `${pct(unattempted, totalQuestions)}% unattempted`, 'HIGH'));
  if (sections.length > 1 && weakestSection && bestSection && bestSection.accuracy - weakestSection.accuracy >= 35) threats.push(item('Section imbalance', 'A large section gap can make your final score depend too much on paper composition.', `${bestSection.name} vs ${weakestSection.name}`, 'MEDIUM'));
  if (!threats.length) threats.push(item('Complacency risk', 'The attempt is stable, but improvement needs deliberate review rather than only taking more mocks.', 'Review before next test', 'LOW'));

  return {
    summary: buildSummary(score, totalMarks, accuracy, correct, incorrect, unattempted, weakestTopic?.name),
    strengths: strengths.slice(0, 4) as Prisma.InputJsonValue,
    weaknesses: weaknesses.slice(0, 4) as Prisma.InputJsonValue,
    opportunities: opportunities.slice(0, 4) as Prisma.InputJsonValue,
    threats: threats.slice(0, 4) as Prisma.InputJsonValue,
  };
};

const groupedPerformance = (answers: any[], keyFn: (answer: any) => string) => {
  const map = new Map<string, PerformanceRow>();
  for (const answer of answers) {
    const name = keyFn(answer) || 'Untitled';
    const row = map.get(name) ?? { name, total: 0, correct: 0, incorrect: 0, unattempted: 0, attempted: 0, accuracy: 0, correctShare: 0, incorrectShare: 0, unattemptedShare: 0 };
    row.total += 1;
    if (answer.status === AnswerStatus.CORRECT) row.correct += 1;
    else if (answer.status === AnswerStatus.UNATTEMPTED) row.unattempted += 1;
    else row.incorrect += 1;
    row.attempted = row.correct + row.incorrect;
    row.accuracy = pct(row.correct, row.attempted);
    row.correctShare = pct(row.correct, row.total);
    row.incorrectShare = pct(row.incorrect, row.total);
    row.unattemptedShare = pct(row.unattempted, row.total);
    map.set(name, row);
  }
  return [...map.values()];
};

const buildSummary = (score: number, totalMarks: number, accuracy: number, correct: number, incorrect: number, unattempted: number, weakestTopic?: string) => {
  const scoreLine = `You scored ${score}/${totalMarks} with ${accuracy}% accuracy.`;
  const balanceLine = `Your attempt had ${correct} correct, ${incorrect} incorrect and ${unattempted} unattempted answers.`;
  const focusLine = weakestTopic ? `The first improvement focus should be ${weakestTopic}, followed by reviewing skipped and negative-marked questions.` : 'The first improvement focus should be reviewing skipped and negative-marked questions.';
  return `${scoreLine} ${balanceLine} ${focusLine}`;
};

const mapSwot = (row: any) => ({
  id: row.id,
  summary: row.summary,
  strengths: row.strengths,
  weaknesses: row.weaknesses,
  opportunities: row.opportunities,
  threats: row.threats,
  generatedAt: row.generatedAt,
  updatedAt: row.updatedAt,
});
