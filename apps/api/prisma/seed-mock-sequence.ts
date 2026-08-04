import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

const ensure = async <T>(value: T | null, message: string): Promise<T> => {
  if (!value) throw new Error(message);
  return value;
};

const findOrCreateHierarchy = async (adminId: string, subjectName: string, topicName: string, subtopicName: string) => {
  let subject = await prisma.subject.findUnique({ where: { name: subjectName } });
  if (!subject) {
    const last = await prisma.subject.findFirst({ orderBy: { displayOrder: 'desc' } });
    subject = await prisma.subject.create({ data: { name: subjectName, description: `${subjectName} practice`, displayOrder: (last?.displayOrder ?? 0) + 1, isActive: true, createdById: adminId, updatedById: adminId } });
  }
  let topic = await prisma.topic.findUnique({ where: { subjectId_name: { subjectId: subject.id, name: topicName } } });
  if (!topic) {
    const last = await prisma.topic.findFirst({ where: { subjectId: subject.id }, orderBy: { displayOrder: 'desc' } });
    topic = await prisma.topic.create({ data: { subjectId: subject.id, name: topicName, description: `${topicName} practice`, displayOrder: (last?.displayOrder ?? 0) + 1, isActive: true, createdById: adminId, updatedById: adminId } });
  }
  let subtopic = await prisma.subtopic.findUnique({ where: { topicId_name: { topicId: topic.id, name: subtopicName } } });
  if (!subtopic) {
    const last = await prisma.subtopic.findFirst({ where: { topicId: topic.id }, orderBy: { displayOrder: 'desc' } });
    subtopic = await prisma.subtopic.create({ data: { topicId: topic.id, name: subtopicName, description: `${subtopicName} practice`, displayOrder: (last?.displayOrder ?? 0) + 1, isActive: true, createdById: adminId, updatedById: adminId } });
  }
  return { subject, topic, subtopic };
};

const upsertMockExamByName = async (input: Parameters<typeof prisma.mockExam.create>[0]['data'] & { name: string }) => {
  const existing = await prisma.mockExam.findFirst({ where: { name: input.name } });
  return existing
    ? prisma.mockExam.update({ where: { id: existing.id }, data: { ...input, createdById: existing.createdById } })
    : prisma.mockExam.create({ data: input });
};

async function seedMock(index: number, context: Awaited<ReturnType<typeof loadContext>>) {
  const mock = await upsertMockExamByName({
    examTypeId: context.ipmat.id,
    mockExamTypeId: context.fullLength.id,
    name: `IPMAT Full Length Mock ${index}`,
    description: `A compact IPMAT full length mock ${index} for testing sequential attempts and analysis.`,
    instructions: 'Attempt sections in order. Answers are auto-saved. Submit only when you are ready to evaluate your performance.',
    difficultyId: context.difficulty.id,
    durationMinutes: 45,
    totalMarks: '24',
    passingMarks: null,
    canGoBackBetweenSections: true,
    isFree: false,
    isActive: true,
    createdById: context.admin.id,
    updatedById: context.admin.id,
  });

  const sectionInputs = [
    { type: context.qaType, name: 'QA', instructions: 'Solve the quantitative questions.', hierarchy: context.qaHierarchy },
    { type: context.lrType, name: 'LR', instructions: 'Solve the logical reasoning questions.', hierarchy: context.lrHierarchy },
    { type: context.vaType, name: 'VA', instructions: 'Read the passage and answer verbal questions.', hierarchy: context.vaHierarchy },
  ];

  const sections = [];
  for (const [sectionIndex, item] of sectionInputs.entries()) {
    sections.push(await prisma.mockSection.upsert({
      where: { mockExamId_sequenceNumber: { mockExamId: mock.id, sequenceNumber: sectionIndex + 1 } },
      update: { mockSectionTypeId: item.type.id, name: item.name, instructions: item.instructions, durationMinutes: 15, totalMarks: '8', canGoBackToPreviousQuestion: true, isOptional: false, updatedById: context.admin.id },
      create: { mockExamId: mock.id, mockSectionTypeId: item.type.id, sequenceNumber: sectionIndex + 1, name: item.name, instructions: item.instructions, durationMinutes: 15, totalMarks: '8', canGoBackToPreviousQuestion: true, isOptional: false, createdById: context.admin.id, updatedById: context.admin.id },
    }));
  }

  const passage = 'Effective preparation requires regular feedback, deliberate revision and the courage to inspect mistakes closely. Students who treat mock tests as diagnostic tools usually improve faster than students who treat them only as scorecards.';
  const comprehension = await prisma.mockComprehension.upsert({
    where: { id: (await prisma.mockComprehension.findFirst({ where: { title: `IPMAT Practice Passage ${index}` }, select: { id: true } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
    update: { title: null, passage, updatedById: context.admin.id },
    create: { title: null, passage, createdById: context.admin.id, updatedById: context.admin.id },
  }).catch(async () => {
    const existing = await prisma.mockComprehension.findFirst({ where: { title: `Seed IPMAT Full Length Mock ${index} Passage` } });
    if (existing) return prisma.mockComprehension.update({ where: { id: existing.id }, data: { updatedById: context.admin.id } });
    return prisma.mockComprehension.create({ data: { title: null, passage, createdById: context.admin.id, updatedById: context.admin.id } });
  });

  const questionSets = [
    [
      { type: QuestionType.MCQ, q: 'A price increases by 20% and then decreases by 10%. What is the net change?', o: ['8% increase', '10% increase', '12% increase', '2% decrease'], a: ['A'], e: '1.2 × 0.9 = 1.08, so net increase is 8%.' },
      { type: QuestionType.INTEGER, q: 'If 3x + 7 = 40, find x.', o: null, a: ['11'], e: '3x = 33, so x = 11.' },
    ],
    [
      { type: QuestionType.MCQ, q: 'If all A are B and no B is C, which conclusion follows?', o: ['Some A are C', 'No A is C', 'All C are A', 'Some C are B'], a: ['B'], e: 'Since all A are inside B and B has no overlap with C, no A is C.' },
      { type: QuestionType.MULTIPLE_CORRECT, q: 'Select valid arrangements if P is immediately before Q.', o: ['P Q R S', 'R P Q S', 'Q P R S', 'S R P Q'], a: ['A', 'B', 'D'], e: 'P must be directly before Q. Options A, B and D satisfy it.' },
    ],
    [
      { type: QuestionType.MCQ, q: 'What does the passage mainly recommend?', o: ['Avoiding mocks', 'Using mocks diagnostically', 'Ignoring mistakes', 'Studying without revision'], a: ['B'], e: 'The passage says mock tests should be treated as diagnostic tools.' },
      { type: QuestionType.MCQ, q: 'In the passage, diagnostic most nearly means:', o: ['Decorative', 'Used to identify strengths and weaknesses', 'Random', 'Final'], a: ['B'], e: 'Diagnostic means used to understand what is working and what is weak.' },
    ],
  ];

  for (const [sectionIndex, questions] of questionSets.entries()) {
    for (const [questionIndex, item] of questions.entries()) {
      const hierarchy = sectionInputs[sectionIndex].hierarchy;
      await prisma.mockQuestion.upsert({
        where: { mockSectionId_sequenceNumber: { mockSectionId: sections[sectionIndex].id, sequenceNumber: questionIndex + 1 } },
        update: { topicId: hierarchy.topic.id, subtopicId: hierarchy.subtopic.id, difficultyId: context.difficulty.id, questionType: item.type, question: item.q, options: item.o?.map((text, i) => ({ id: String.fromCharCode(65 + i), text })) ?? null, correctAnswers: item.a, positiveMarks: '4', negativeMarks: '1', explanation: item.e, mockComprehensionId: sectionIndex === 2 ? comprehension.id : null, isActive: true, updatedById: context.admin.id },
        create: { mockSectionId: sections[sectionIndex].id, topicId: hierarchy.topic.id, subtopicId: hierarchy.subtopic.id, difficultyId: context.difficulty.id, sequenceNumber: questionIndex + 1, questionType: item.type, question: item.q, options: item.o?.map((text, i) => ({ id: String.fromCharCode(65 + i), text })) ?? null, correctAnswers: item.a, positiveMarks: '4', negativeMarks: '1', explanation: item.e, mockComprehensionId: sectionIndex === 2 ? comprehension.id : null, isActive: true, createdById: context.admin.id, updatedById: context.admin.id },
      });
    }
  }

  await prisma.mockAttemptAnalytics.upsert({ where: { mockExamId: mock.id }, update: {}, create: { mockExamId: mock.id } });
  for (const section of sections) await prisma.mockSectionAnalytics.upsert({ where: { mockSectionId: section.id }, update: {}, create: { mockSectionId: section.id } });
  return mock;
}

async function loadContext() {
  const admin = await ensure(await prisma.admin.findFirst({ where: { role: 'SUPER_ADMIN', isActive: true }, orderBy: { createdAt: 'asc' } }), 'No active SUPER_ADMIN found.');
  const difficulty = await ensure(await prisma.difficultyLevel.findFirst({ orderBy: { displayOrder: 'asc' } }), 'No difficulty level found.');
  const ipmat = await ensure(await prisma.examType.findUnique({ where: { name: 'IPMAT' } }), 'IPMAT exam type not found. Run mock seed first.');
  const fullLength = await ensure(await prisma.mockExamType.findUnique({ where: { name: 'Full Length Mock' } }), 'Full Length Mock type not found. Run mock seed first.');
  const qaType = await ensure(await prisma.mockSectionType.findUnique({ where: { name: 'Quantitative Aptitude' } }), 'QA section type not found.');
  const lrType = await ensure(await prisma.mockSectionType.findUnique({ where: { name: 'Logical Reasoning' } }), 'LR section type not found.');
  const vaType = await ensure(await prisma.mockSectionType.findUnique({ where: { name: 'Verbal Ability' } }), 'VA section type not found.');
  const qaHierarchy = await findOrCreateHierarchy(admin.id, 'Quantitative Aptitude', 'Arithmetic', 'Percentages');
  const lrHierarchy = await findOrCreateHierarchy(admin.id, 'Logical Reasoning', 'Arrangements', 'Linear Arrangement');
  const vaHierarchy = await findOrCreateHierarchy(admin.id, 'Verbal Ability', 'Reading Comprehension', 'Main Idea');
  return { admin, difficulty, ipmat, fullLength, qaType, lrType, vaType, qaHierarchy, lrHierarchy, vaHierarchy };
}

async function main() {
  const context = await loadContext();
  const mocks = await Promise.all([seedMock(2, context), seedMock(3, context)]);
  console.info('Seeded additional mock sequence tests:', mocks.map((mock) => mock.name));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
