import { ContentType, PrismaClient, QuestionType } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "superadmin@entranceug.local";

const nextSubjectOrder = async (preferred: number) => {
  const occupied = await prisma.subject.findUnique({ where: { displayOrder: preferred }, select: { id: true } });
  if (!occupied) return preferred;
  const last = await prisma.subject.findFirst({ orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });
  return (last?.displayOrder ?? 0) + 1;
};

const ensureSubject = async (adminId: string, name: string, description: string, preferredOrder: number) => {
  const existing = await prisma.subject.findUnique({ where: { name } });
  if (existing) {
    return prisma.subject.update({
      where: { id: existing.id },
      data: { description, isActive: true, updatedById: adminId },
    });
  }

  return prisma.subject.create({
    data: {
      name,
      description,
      displayOrder: await nextSubjectOrder(preferredOrder),
      isActive: true,
      createdById: adminId,
      updatedById: adminId,
    },
  });
};

const ensureTopic = async (adminId: string, subjectId: string, name: string, description: string, displayOrder: number) => {
  const existing = await prisma.topic.findUnique({ where: { subjectId_name: { subjectId, name } } });
  if (existing) {
    return prisma.topic.update({
      where: { id: existing.id },
      data: { description, displayOrder, isActive: true, updatedById: adminId },
    });
  }

  return prisma.topic.create({
    data: {
      subjectId,
      name,
      description,
      displayOrder,
      isActive: true,
      createdById: adminId,
      updatedById: adminId,
    },
  });
};

const ensureSubtopic = async (adminId: string, topicId: string, name: string, description: string, displayOrder: number) => {
  const existing = await prisma.subtopic.findUnique({ where: { topicId_name: { topicId, name } } });
  if (existing) {
    return prisma.subtopic.update({
      where: { id: existing.id },
      data: { description, displayOrder, isActive: true, updatedById: adminId },
    });
  }

  return prisma.subtopic.create({
    data: {
      topicId,
      name,
      description,
      displayOrder,
      isActive: true,
      createdById: adminId,
      updatedById: adminId,
    },
  });
};

const ensureContentTest = async (adminId: string, topicId: string, difficultyId: string) => {
  const existing = await prisma.contentTest.findFirst({ where: { topicId, name: "Arithmetic Topic Test 1" } });
  const data = {
    topicId,
    name: "Arithmetic Topic Test 1",
    description: "Basic assessment for Arithmetic.",
    instructions: "Answer all questions.",
    difficultyId,
    durationMinutes: 20,
    totalMarks: "8",
    canGoBackBetweenSections: true,
    isFree: true,
    isActive: true,
    updatedById: adminId,
  };

  if (existing) return prisma.contentTest.update({ where: { id: existing.id }, data });
  return prisma.contentTest.create({ data: { ...data, createdById: adminId } });
};

async function main() {
  const admin = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error(`Admin ${ADMIN_EMAIL} was not found. Run the mock seed first.`);

  const difficulty = await prisma.difficultyLevel.findFirst({ orderBy: { displayOrder: "asc" } });
  if (!difficulty) throw new Error("No difficulty level exists. Run the mock seed first or create a difficulty level.");

  const mathematics = await ensureSubject(
    admin.id,
    "Mathematics",
    "Mathematics preparation for management entrance examinations.",
    1,
  );

  const english = await ensureSubject(
    admin.id,
    "English",
    "English language and verbal ability preparation.",
    2,
  );

  const arithmetic = await ensureTopic(
    admin.id,
    mathematics.id,
    "Arithmetic",
    "Arithmetic fundamentals for IPMAT and JIPMAT.",
    1,
  );

  await ensureTopic(
    admin.id,
    mathematics.id,
    "Algebra",
    "Algebra concepts for entrance examinations.",
    2,
  );

  const percentages = await ensureSubtopic(
    admin.id,
    arithmetic.id,
    "Percentages",
    "Understanding percentages and percentage calculations.",
    1,
  );

  await ensureSubtopic(
    admin.id,
    arithmetic.id,
    "Profit and Loss",
    "Profit, loss, discount and marked price.",
    2,
  );

  const contents = [
    {
      title: "Introduction to Percentages",
      description: "Learn the basics of percentages with simple examples.",
      contentType: ContentType.YOUTUBE,
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sequenceNumber: 1,
      estimatedDurationMinutes: 20,
      isFree: true,
    },
    {
      title: "Percentage Formula Cheat Sheet",
      description: "Important formulas and tricks for solving percentage questions quickly.",
      contentType: ContentType.PDF,
      contentUrl: "https://example.com/percentage-formulas.pdf",
      sequenceNumber: 2,
      estimatedDurationMinutes: 15,
      isFree: false,
    },
    {
      title: "Percentage Practice Notes",
      description: "Practice notes with solved examples.",
      contentType: ContentType.DOCUMENT,
      contentUrl: "https://example.com/percentage-notes",
      sequenceNumber: 3,
      estimatedDurationMinutes: 25,
      isFree: true,
    },
  ];

  for (const content of contents) {
    await prisma.content.upsert({
      where: { subtopicId_sequenceNumber: { subtopicId: percentages.id, sequenceNumber: content.sequenceNumber } },
      update: {
        title: content.title,
        description: content.description,
        contentType: content.contentType,
        contentUrl: content.contentUrl,
        estimatedDurationMinutes: content.estimatedDurationMinutes,
        isFree: content.isFree,
        isActive: true,
        updatedById: admin.id,
      },
      create: {
        ...content,
        subtopicId: percentages.id,
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  const contentTest = await ensureContentTest(admin.id, arithmetic.id, difficulty.id);

  const sectionSeeds = [
    { name: "Arithmetic Basics", sequenceNumber: 1, durationMinutes: 10, totalMarks: "4", instructions: "Attempt all questions." },
    { name: "Application Problems", sequenceNumber: 2, durationMinutes: 10, totalMarks: "4", instructions: "Attempt all questions." },
  ];

  const sections = [];
  for (const section of sectionSeeds) {
    sections.push(await prisma.contentSection.upsert({
      where: { contentTestId_sequenceNumber: { contentTestId: contentTest.id, sequenceNumber: section.sequenceNumber } },
      update: { ...section, canGoBackToPreviousQuestion: true, updatedById: admin.id },
      create: { ...section, contentTestId: contentTest.id, canGoBackToPreviousQuestion: true, createdById: admin.id, updatedById: admin.id },
    }));
  }

  const questions = [
    {
      section: sections[0],
      sequenceNumber: 1,
      question: "What is 25% of 360?",
      options: [{ id: "A", text: "60" }, { id: "B", text: "75" }, { id: "C", text: "90" }, { id: "D", text: "120" }],
      correctAnswers: ["C"],
      explanation: "25% is one-fourth. One-fourth of 360 is 90.",
    },
    {
      section: sections[0],
      sequenceNumber: 2,
      question: "If a number increases from 80 to 100, what is the percentage increase?",
      options: [{ id: "A", text: "20%" }, { id: "B", text: "25%" }, { id: "C", text: "30%" }, { id: "D", text: "40%" }],
      correctAnswers: ["B"],
      explanation: "Increase is 20 on a base of 80. 20/80 x 100 = 25%.",
    },
    {
      section: sections[1],
      sequenceNumber: 1,
      question: "A value is reduced by 10% and then increased by 10%. What is the net change?",
      options: [{ id: "A", text: "No change" }, { id: "B", text: "1% decrease" }, { id: "C", text: "1% increase" }, { id: "D", text: "2% decrease" }],
      correctAnswers: ["B"],
      explanation: "Successive -10% and +10% gives -1% net change.",
    },
    {
      section: sections[1],
      sequenceNumber: 2,
      question: "A student scores 72 out of 90. What percentage did the student score?",
      options: [{ id: "A", text: "75%" }, { id: "B", text: "78%" }, { id: "C", text: "80%" }, { id: "D", text: "82%" }],
      correctAnswers: ["C"],
      explanation: "72/90 x 100 = 80%.",
    },
  ];

  for (const item of questions) {
    await prisma.contentQuestion.upsert({
      where: {
        contentSectionId_sequenceNumber: {
          contentSectionId: item.section.id,
          sequenceNumber: item.sequenceNumber,
        },
      },
      update: {
        contentComprehensionId: null,
        topicId: arithmetic.id,
        subtopicId: percentages.id,
        difficultyId: difficulty.id,
        questionType: QuestionType.MCQ,
        question: item.question,
        options: item.options,
        correctAnswers: item.correctAnswers,
        positiveMarks: "2",
        negativeMarks: "0.5",
        explanation: item.explanation,
        imageUrl: null,
        isActive: true,
        updatedById: admin.id,
      },
      create: {
        contentSectionId: item.section.id,
        contentComprehensionId: null,
        topicId: arithmetic.id,
        subtopicId: percentages.id,
        difficultyId: difficulty.id,
        sequenceNumber: item.sequenceNumber,
        questionType: QuestionType.MCQ,
        question: item.question,
        options: item.options,
        correctAnswers: item.correctAnswers,
        positiveMarks: "2",
        negativeMarks: "0.5",
        explanation: item.explanation,
        imageUrl: null,
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  const [contentCount, testCount, sectionCount, questionCount, completions, notes, attempts, access] = await Promise.all([
    prisma.content.count({ where: { subtopicId: percentages.id } }),
    prisma.contentTest.count({ where: { topicId: arithmetic.id } }),
    prisma.contentSection.count({ where: { contentTestId: contentTest.id } }),
    prisma.contentQuestion.count({ where: { contentSection: { contentTestId: contentTest.id } } }),
    prisma.studentContentCompletion.count(),
    prisma.contentNote.count(),
    prisma.contentAttempt.count(),
    prisma.studentContentAccess.count(),
  ]);

  console.info("Content seed completed", {
    subjects: [mathematics.name, english.name],
    mathematicsDisplayOrder: mathematics.displayOrder,
    englishDisplayOrder: english.displayOrder,
    topic: arithmetic.name,
    contentCount,
    testCount,
    sectionCount,
    questionCount,
    untouchedStudentTables: { completions, notes, attempts, studentContentAccess: access },
  });
}

main()
  .catch((error) => {
    console.error("Content seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
