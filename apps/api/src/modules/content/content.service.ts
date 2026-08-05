import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';

const activeAccess = (studentId: string) => prisma.studentContentAccess.findFirst({
  where: { studentId, expiryDate: { gte: new Date() } },
  select: { id: true },
});

const youtubeThumbnail = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
};

export const getLearningTree = async (studentId: string) => {
  const [access, subjects] = await Promise.all([
    activeAccess(studentId),
    prisma.subject.findMany({
      where: {
        isActive: true,
        topics: { some: { isActive: true, OR: [
          { subtopics: { some: { isActive: true, contents: { some: { isActive: true } } } } },
          { contentTests: { some: { isActive: true } } },
        ] } },
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        topics: {
          where: { isActive: true }, orderBy: { displayOrder: 'asc' },
          include: {
            subtopics: {
              where: { isActive: true }, orderBy: { displayOrder: 'asc' },
              include: {
                contents: {
                  where: { isActive: true }, orderBy: { sequenceNumber: 'asc' },
                  include: { completions: { where: { studentId }, select: { id: true, completedAt: true } }, notes: { where: { studentId }, select: { id: true, note: true, updatedAt: true } } },
                },
              },
            },
            contentTests: {
              where: { isActive: true }, orderBy: { createdAt: 'desc' },
              include: {
                difficulty: { select: { name: true } },
                _count: { select: { sections: true } },
                sections: { select: { _count: { select: { questions: { where: { isActive: true } } } } } },
                attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, submittedAt: true, marksScored: true, accuracy: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  const hasPaidAccess = Boolean(access);

  return {
    hasPaidAccess,
    subjects: subjects.map((subject) => {
      const topics = subject.topics.map((topic) => {
        const subtopics = topic.subtopics.map((subtopic) => {
          const contents = subtopic.contents.map((content) => {
            const hasAccess = content.isFree || hasPaidAccess;
            const completion = content.completions[0] ?? null;
            const note = content.notes[0] ?? null;
            return {
              id: content.id, title: content.title, description: content.description,
              contentType: content.contentType, contentUrl: hasAccess ? content.contentUrl : null,
              thumbnailUrl: hasAccess && content.contentType === 'YOUTUBE' ? youtubeThumbnail(content.contentUrl) : null,
              sequenceNumber: content.sequenceNumber, isFree: content.isFree,
              estimatedDurationMinutes: content.estimatedDurationMinutes, hasAccess,
              completed: Boolean(completion), completedAt: completion?.completedAt ?? null,
              note: note ? { id: note.id, text: note.note, updatedAt: note.updatedAt } : null,
            };
          });
          return {
            id: subtopic.id, name: subtopic.name, description: subtopic.description, contents,
            totalContentCount: contents.length, completedContentCount: contents.filter((item) => item.completed).length,
          };
        });
        const allContents = subtopics.flatMap((subtopic) => subtopic.contents);
        return {
          id: topic.id, name: topic.name, description: topic.description, subtopics,
          totalContentCount: allContents.length, completedContentCount: allContents.filter((item) => item.completed).length,
          estimatedDurationMinutes: allContents.reduce((sum, item) => sum + (item.estimatedDurationMinutes ?? 0), 0),
          tests: topic.contentTests.map((test) => {
            const latestAttempt = test.attempts[0] ?? null;
            const hasAccess = test.isFree || hasPaidAccess;
            const isSubmitted = latestAttempt?.status === 'SUBMITTED' || latestAttempt?.status === 'AUTO_SUBMITTED';
            return {
              id: test.id, name: test.name, description: test.description, durationMinutes: test.durationMinutes,
              totalMarks: Number(test.totalMarks), difficulty: test.difficulty.name, isFree: test.isFree,
              hasAccess, canAttempt: hasAccess && !isSubmitted,
              sectionCount: test._count.sections,
              totalQuestions: test.sections.reduce((sum, section) => sum + section._count.questions, 0),
              attempt: latestAttempt ? { id: latestAttempt.id, status: latestAttempt.status, submittedAt: latestAttempt.submittedAt, marksScored: Number(latestAttempt.marksScored), accuracy: Number(latestAttempt.accuracy) } : null,
            };
          }),
        };
      });
      const allContents = topics.flatMap((topic) => topic.subtopics.flatMap((subtopic) => subtopic.contents));
      return {
        id: subject.id, name: subject.name, description: subject.description, topics,
        totalContentCount: allContents.length, completedContentCount: allContents.filter((item) => item.completed).length,
      };
    }),
  };
};

export const setCompletion = async (studentId: string, contentId: string, completed: boolean) => {
  const content = await prisma.content.findFirst({ where: { id: contentId, isActive: true }, select: { id: true, isFree: true } });
  if (!content) throw new AppError(404, 'Learning resource not found.');
  if (!content.isFree && !(await activeAccess(studentId))) throw new AppError(403, 'This resource is locked for your account.');
  if (!completed) {
    await prisma.studentContentCompletion.deleteMany({ where: { studentId, contentId } });
    return { contentId, completed: false, completedAt: null };
  }
  const completion = await prisma.studentContentCompletion.upsert({
    where: { studentId_contentId: { studentId, contentId } },
    create: { studentId, contentId }, update: {}, select: { completedAt: true },
  });
  return { contentId, completed: true, completedAt: completion.completedAt };
};

export const saveNote = async (studentId: string, contentId: string, note: string) => {
  const content = await prisma.content.findFirst({ where: { id: contentId, isActive: true }, select: { id: true, isFree: true } });
  if (!content) throw new AppError(404, 'Learning resource not found.');
  if (!content.isFree && !(await activeAccess(studentId))) throw new AppError(403, 'This resource is locked for your account.');
  const savedNote = await prisma.contentNote.upsert({
    where: { studentId_contentId: { studentId, contentId } },
    create: { studentId, contentId, note }, update: { note },
    select: { id: true, note: true, updatedAt: true },
  });
  return { id: savedNote.id, text: savedNote.note, updatedAt: savedNote.updatedAt };
};

export const listAttempts = async (studentId: string) => {
  const attempts = await prisma.contentAttempt.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: {
      contentTest: { select: { id: true, name: true, totalMarks: true, durationMinutes: true, topic: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } } } },
      sections: { include: { contentSection: { select: { id: true, name: true, totalMarks: true } } }, orderBy: { contentSection: { sequenceNumber: 'asc' } } },
    },
  });
  return attempts.map((attempt) => ({
    id: attempt.id, status: attempt.status, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt,
    timeTakenSeconds: attempt.timeTakenSeconds, totalMarks: Number(attempt.totalMarks), marksScored: Number(attempt.marksScored),
    correctAnswers: attempt.correctAnswers, incorrectAnswers: attempt.incorrectAnswers, unattemptedAnswers: attempt.unattemptedAnswers,
    accuracy: Number(attempt.accuracy), createdAt: attempt.createdAt,
    test: { id: attempt.contentTest.id, name: attempt.contentTest.name, durationMinutes: attempt.contentTest.durationMinutes, totalMarks: Number(attempt.contentTest.totalMarks), topic: attempt.contentTest.topic.name, subject: attempt.contentTest.topic.subject.name },
    sections: attempt.sections.map((section) => ({ id: section.contentSection.id, name: section.contentSection.name, totalMarks: Number(section.contentSection.totalMarks), marksScored: Number(section.marksScored), accuracy: Number(section.accuracy), timeTakenSeconds: section.timeTakenSeconds, correctAnswers: section.correctAnswers, incorrectAnswers: section.incorrectAnswers, unattemptedAnswers: section.unattemptedAnswers })),
  }));
};

export const getAttemptDetail = async (studentId: string, attemptId: string) => {
  const attempt = await prisma.contentAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      contentTest: {
        include: {
          topic: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } },
          difficulty: { select: { name: true } },
        },
      },
      sections: {
        include: { contentSection: { select: { id: true, name: true, sequenceNumber: true, totalMarks: true } } },
        orderBy: { contentSection: { sequenceNumber: 'asc' } },
      },
      answers: {
        include: {
          contentSection: { select: { id: true, name: true, sequenceNumber: true } },
          contentQuestion: {
            include: {
              difficulty: { select: { id: true, name: true } },
              subtopic: { select: { id: true, name: true } },
              topic: { select: { id: true, name: true } },
              contentComprehension: { select: { id: true, title: true, passage: true } },
            },
          },
        },
        orderBy: [
          { contentSection: { sequenceNumber: 'asc' } },
          { contentQuestion: { sequenceNumber: 'asc' } },
        ],
      },
    },
  });
  if (!attempt) throw new AppError(404, 'Content test attempt not found.');

  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    timeTakenSeconds: attempt.timeTakenSeconds,
    totalMarks: Number(attempt.totalMarks),
    marksScored: Number(attempt.marksScored),
    correctAnswers: attempt.correctAnswers,
    incorrectAnswers: attempt.incorrectAnswers,
    unattemptedAnswers: attempt.unattemptedAnswers,
    accuracy: Number(attempt.accuracy),
    test: {
      id: attempt.contentTest.id,
      name: attempt.contentTest.name,
      description: attempt.contentTest.description,
      instructions: attempt.contentTest.instructions,
      durationMinutes: attempt.contentTest.durationMinutes,
      totalMarks: Number(attempt.contentTest.totalMarks),
      difficulty: attempt.contentTest.difficulty.name,
      topic: attempt.contentTest.topic.name,
      subject: attempt.contentTest.topic.subject.name,
    },
    sections: attempt.sections.map((section) => ({
      id: section.contentSection.id,
      name: section.contentSection.name,
      totalMarks: Number(section.contentSection.totalMarks),
      marksScored: Number(section.marksScored),
      accuracy: Number(section.accuracy),
      timeTakenSeconds: section.timeTakenSeconds,
      correctAnswers: section.correctAnswers,
      incorrectAnswers: section.incorrectAnswers,
      unattemptedAnswers: section.unattemptedAnswers,
    })),
    answers: attempt.answers.map((answer) => ({
      id: answer.id,
      questionId: answer.contentQuestionId,
      sectionId: answer.contentSectionId,
      sectionName: answer.contentSection.name,
      sequenceNumber: answer.contentQuestion.sequenceNumber,
      questionType: answer.contentQuestion.questionType,
      question: answer.contentQuestion.question,
      options: answer.contentQuestion.options,
      selectedAnswers: answer.selectedAnswers,
      correctAnswers: answer.correctAnswers,
      status: answer.status,
      marksAwarded: Number(answer.marksAwarded),
      positiveMarks: Number(answer.contentQuestion.positiveMarks),
      negativeMarks: Number(answer.contentQuestion.negativeMarks),
      timeTakenSeconds: answer.timeTakenSeconds,
      visited: answer.visited,
      bookmarked: answer.bookmarked,
      markedForReview: answer.markedForReview,
      answeredAt: answer.answeredAt,
      explanation: answer.contentQuestion.explanation,
      imageUrl: answer.contentQuestion.imageUrl,
      difficulty: answer.contentQuestion.difficulty.name,
      topic: answer.contentQuestion.topic.name,
      subtopic: answer.contentQuestion.subtopic.name,
      comprehension: answer.contentQuestion.contentComprehension ? {
        id: answer.contentQuestion.contentComprehension.id,
        title: answer.contentQuestion.contentComprehension.title,
        passage: answer.contentQuestion.contentComprehension.passage,
      } : null,
    })),
  };
};

export const setAttemptAnswerBookmark = async (studentId: string, answerId: string, bookmarked: boolean) => {
  const answer = await prisma.contentAttemptAnswer.findFirst({
    where: { id: answerId, contentAttempt: { studentId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } } },
    select: { id: true },
  });
  if (!answer) throw new AppError(404, 'Attempt answer not found.');
  const updated = await prisma.contentAttemptAnswer.update({
    where: { id: answerId },
    data: { bookmarked },
    select: { id: true, bookmarked: true },
  });
  return updated;
};
