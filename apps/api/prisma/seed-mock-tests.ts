import { PrismaClient, AdminRole, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "superadmin@entranceug.local";
const ADMIN_USERNAME = "superadmin";
const ADMIN_PASSWORD = "1234567890";

async function getNextSubjectDisplayOrder() {
  const last = await prisma.subject.findFirst({ orderBy: { displayOrder: "desc" } });
  return (last?.displayOrder ?? 0) + 1;
}

async function getNextTopicDisplayOrder(subjectId: string) {
  const last = await prisma.topic.findFirst({
    where: { subjectId },
    orderBy: { displayOrder: "desc" },
  });
  return (last?.displayOrder ?? 0) + 1;
}

async function getNextSubtopicDisplayOrder(topicId: string) {
  const last = await prisma.subtopic.findFirst({
    where: { topicId },
    orderBy: { displayOrder: "desc" },
  });
  return (last?.displayOrder ?? 0) + 1;
}

async function ensureAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  return prisma.admin.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Entrance UG Super Admin",
      username: ADMIN_USERNAME,
      emailVerified: true,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      canManageStudents: true,
      canManageParents: true,
      canManageMentors: true,
      canManageMockTests: true,
      canManageContent: true,
      canManageRcTests: true,
      canManageMentorship: true,
      canManagePlans: true,
      canManageAnalytics: true,
      canManageFeedback: true,
      canManageDashboardNotices: true,
      canManageWebsiteSettings: true,
      canManageAdmins: true,
    },
    create: {
      name: "Entrance UG Super Admin",
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      canManageStudents: true,
      canManageParents: true,
      canManageMentors: true,
      canManageMockTests: true,
      canManageContent: true,
      canManageRcTests: true,
      canManageMentorship: true,
      canManagePlans: true,
      canManageAnalytics: true,
      canManageFeedback: true,
      canManageDashboardNotices: true,
      canManageWebsiteSettings: true,
      canManageAdmins: true,
    },
  });
}

async function ensureDifficulty(adminId: string) {
  const firstDifficulty = await prisma.difficultyLevel.findFirst({
    orderBy: { displayOrder: "asc" },
  });

  if (firstDifficulty) {
    return firstDifficulty;
  }

  return prisma.difficultyLevel.create({
    data: {
      name: "Easy",
      description: "Introductory difficulty level for seeded mock tests.",
      displayOrder: 1,
      createdById: adminId,
      updatedById: adminId,
    },
  });
}

async function ensureSubjectHierarchy(adminId: string, subjectName: string, topicName: string, subtopicName: string) {
  let subject = await prisma.subject.findUnique({ where: { name: subjectName } });

  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: subjectName,
        description: `${subjectName} subject area for mock test questions.`,
        displayOrder: await getNextSubjectDisplayOrder(),
        isActive: true,
        createdById: adminId,
        updatedById: adminId,
      },
    });
  }

  let topic = await prisma.topic.findUnique({
    where: { subjectId_name: { subjectId: subject.id, name: topicName } },
  });

  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        subjectId: subject.id,
        name: topicName,
        description: `${topicName} topic for seeded mock test questions.`,
        displayOrder: await getNextTopicDisplayOrder(subject.id),
        isActive: true,
        createdById: adminId,
        updatedById: adminId,
      },
    });
  }

  let subtopic = await prisma.subtopic.findUnique({
    where: { topicId_name: { topicId: topic.id, name: subtopicName } },
  });

  if (!subtopic) {
    subtopic = await prisma.subtopic.create({
      data: {
        topicId: topic.id,
        name: subtopicName,
        description: `${subtopicName} subtopic for seeded mock test questions.`,
        displayOrder: await getNextSubtopicDisplayOrder(topic.id),
        isActive: true,
        createdById: adminId,
        updatedById: adminId,
      },
    });
  }

  return { subject, topic, subtopic };
}

async function main() {
  const admin = await ensureAdmin();
  const difficulty = await ensureDifficulty(admin.id);

  const [ipmat, jipmat] = await Promise.all([
    prisma.examType.upsert({
      where: { name: "IPMAT" },
      update: { isActive: true, updatedById: admin.id },
      create: {
        name: "IPMAT",
        description: "Integrated Programme in Management Aptitude Test preparation.",
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.examType.upsert({
      where: { name: "JIPMAT" },
      update: { isActive: true, updatedById: admin.id },
      create: {
        name: "JIPMAT",
        description: "Joint Integrated Programme in Management Admission Test preparation.",
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
  ]);

  const [fullLengthMock, sectionalMock] = await Promise.all([
    prisma.mockExamType.upsert({
      where: { name: "Full Length Mock" },
      update: { isActive: true, updatedById: admin.id },
      create: {
        name: "Full Length Mock",
        description: "Complete exam simulation across all sections.",
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.mockExamType.upsert({
      where: { name: "Sectional Mock" },
      update: { isActive: true, updatedById: admin.id },
      create: {
        name: "Sectional Mock",
        description: "Focused practice for one section.",
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
  ]);

  const [qaType, lrType, vaType] = await Promise.all([
    prisma.mockSectionType.upsert({
      where: { name: "Quantitative Aptitude" },
      update: { isActive: true, updatedById: admin.id },
      create: {
        name: "Quantitative Aptitude",
        description: "Numerical ability, arithmetic and quantitative reasoning.",
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.mockSectionType.upsert({
      where: { name: "Logical Reasoning" },
      update: { isActive: true, updatedById: admin.id },
      create: {
        name: "Logical Reasoning",
        description: "Analytical reasoning, arrangements and logic.",
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.mockSectionType.upsert({
      where: { name: "Verbal Ability" },
      update: { isActive: true, updatedById: admin.id },
      create: {
        name: "Verbal Ability",
        description: "Reading comprehension, vocabulary and grammar.",
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
  ]);

  const qaHierarchy = await ensureSubjectHierarchy(admin.id, "Quantitative Aptitude", "Arithmetic", "Percentages");
  const lrHierarchy = await ensureSubjectHierarchy(admin.id, "Logical Reasoning", "Arrangements", "Linear Arrangement");
  const vaHierarchy = await ensureSubjectHierarchy(admin.id, "Verbal Ability", "Reading Comprehension", "Main Idea");

  const existingExam = await prisma.mockExam.findFirst({
    where: { name: "IPMAT Full Length Mock 1" },
  });

  const mockExam = existingExam
    ? await prisma.mockExam.update({
        where: { id: existingExam.id },
        data: {
          examTypeId: ipmat.id,
          mockExamTypeId: fullLengthMock.id,
          description: "A compact IPMAT full length mock covering QA, LR and VA.",
          instructions:
            "Read every question carefully. Each section has two questions. Answers are auto-saved during the test engine flow.",
          difficultyId: difficulty.id,
          durationMinutes: 45,
          totalMarks: "24",
          passingMarks: null,
          canGoBackBetweenSections: true,
          isFree: false,
          isActive: true,
          updatedById: admin.id,
        },
      })
    : await prisma.mockExam.create({
        data: {
          examTypeId: ipmat.id,
          mockExamTypeId: fullLengthMock.id,
          name: "IPMAT Full Length Mock 1",
          description: "A compact IPMAT full length mock covering QA, LR and VA.",
          instructions:
            "Read every question carefully. Each section has two questions. Answers are auto-saved during the test engine flow.",
          difficultyId: difficulty.id,
          durationMinutes: 45,
          totalMarks: "24",
          passingMarks: null,
          canGoBackBetweenSections: true,
          isFree: false,
          isActive: true,
          createdById: admin.id,
          updatedById: admin.id,
        },
      });

  const [qaSection, lrSection, vaSection] = await Promise.all([
    prisma.mockSection.upsert({
      where: { mockExamId_sequenceNumber: { mockExamId: mockExam.id, sequenceNumber: 1 } },
      update: {
        mockSectionTypeId: qaType.id,
        name: "QA",
        instructions: "Solve both quantitative aptitude questions.",
        durationMinutes: 15,
        totalMarks: "8",
        canGoBackToPreviousQuestion: true,
        isOptional: false,
        updatedById: admin.id,
      },
      create: {
        mockExamId: mockExam.id,
        mockSectionTypeId: qaType.id,
        sequenceNumber: 1,
        name: "QA",
        instructions: "Solve both quantitative aptitude questions.",
        durationMinutes: 15,
        totalMarks: "8",
        canGoBackToPreviousQuestion: true,
        isOptional: false,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.mockSection.upsert({
      where: { mockExamId_sequenceNumber: { mockExamId: mockExam.id, sequenceNumber: 2 } },
      update: {
        mockSectionTypeId: lrType.id,
        name: "LR",
        instructions: "Solve both logical reasoning questions.",
        durationMinutes: 15,
        totalMarks: "8",
        canGoBackToPreviousQuestion: true,
        isOptional: false,
        updatedById: admin.id,
      },
      create: {
        mockExamId: mockExam.id,
        mockSectionTypeId: lrType.id,
        sequenceNumber: 2,
        name: "LR",
        instructions: "Solve both logical reasoning questions.",
        durationMinutes: 15,
        totalMarks: "8",
        canGoBackToPreviousQuestion: true,
        isOptional: false,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.mockSection.upsert({
      where: { mockExamId_sequenceNumber: { mockExamId: mockExam.id, sequenceNumber: 3 } },
      update: {
        mockSectionTypeId: vaType.id,
        name: "VA",
        instructions: "Read the passage and solve both verbal ability questions.",
        durationMinutes: 15,
        totalMarks: "8",
        canGoBackToPreviousQuestion: true,
        isOptional: false,
        updatedById: admin.id,
      },
      create: {
        mockExamId: mockExam.id,
        mockSectionTypeId: vaType.id,
        sequenceNumber: 3,
        name: "VA",
        instructions: "Read the passage and solve both verbal ability questions.",
        durationMinutes: 15,
        totalMarks: "8",
        canGoBackToPreviousQuestion: true,
        isOptional: false,
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
  ]);

  let comprehension = await prisma.mockComprehension.findFirst({
    where: { title: "Seed IPMAT Full Length Mock 1 Passage" },
  });

  if (!comprehension) {
    comprehension = await prisma.mockComprehension.create({
      data: {
        title: "Seed IPMAT Full Length Mock 1 Passage",
        passage:
          "Technology in education works best when it supports disciplined learning rather than replacing it. A useful platform gives students timely feedback, clear practice pathways and enough structure to measure progress without making the learning experience mechanical.",
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  } else {
    comprehension = await prisma.mockComprehension.update({
      where: { id: comprehension.id },
      data: {
        passage:
          "Technology in education works best when it supports disciplined learning rather than replacing it. A useful platform gives students timely feedback, clear practice pathways and enough structure to measure progress without making the learning experience mechanical.",
        updatedById: admin.id,
      },
    });
  }

  const questionData = [
    {
      section: qaSection,
      hierarchy: qaHierarchy,
      sequenceNumber: 1,
      questionType: QuestionType.MCQ,
      question: "If 35% of a number is 84, what is the number?",
      options: [
        { id: "A", text: "210" },
        { id: "B", text: "220" },
        { id: "C", text: "230" },
        { id: "D", text: "240" },
      ],
      correctAnswers: ["D"],
      explanation: "35% of 240 equals 84, so the required number is 240.",
    },
    {
      section: qaSection,
      hierarchy: qaHierarchy,
      sequenceNumber: 2,
      questionType: QuestionType.INTEGER,
      question: "The average of 12, 18, 24 and x is 21. Find x.",
      options: null,
      correctAnswers: ["30"],
      explanation: "Total required sum is 21 x 4 = 84. Existing sum is 54, so x is 30.",
    },
    {
      section: lrSection,
      hierarchy: lrHierarchy,
      sequenceNumber: 1,
      questionType: QuestionType.MCQ,
      question: "Five students stand in a line. A is immediately left of B. C is at one end. If B is third from the left, where is A?",
      options: [
        { id: "A", text: "First from the left" },
        { id: "B", text: "Second from the left" },
        { id: "C", text: "Fourth from the left" },
        { id: "D", text: "Fifth from the left" },
      ],
      correctAnswers: ["B"],
      explanation: "B is third from the left and A is immediately left of B, so A is second from the left.",
    },
    {
      section: lrSection,
      hierarchy: lrHierarchy,
      sequenceNumber: 2,
      questionType: QuestionType.MULTIPLE_CORRECT,
      question: "Which of the following are valid conclusions if every manager is a leader and some leaders are mentors?",
      options: [
        { id: "A", text: "All managers are leaders" },
        { id: "B", text: "Some leaders are mentors" },
        { id: "C", text: "All mentors are managers" },
        { id: "D", text: "Some managers must be mentors" },
      ],
      correctAnswers: ["A", "B"],
      explanation: "The statements directly support A and B. They do not guarantee C or D.",
    },
    {
      section: vaSection,
      hierarchy: vaHierarchy,
      comprehension,
      sequenceNumber: 1,
      questionType: QuestionType.MCQ,
      question: "What is the main idea of the passage?",
      options: [
        { id: "A", text: "Technology should replace teachers completely" },
        { id: "B", text: "Education platforms should support structured learning and feedback" },
        { id: "C", text: "Students should avoid digital tools" },
        { id: "D", text: "Progress measurement makes learning mechanical" },
      ],
      correctAnswers: ["B"],
      explanation: "The passage argues that technology should support disciplined learning through feedback, pathways and progress measurement.",
    },
    {
      section: vaSection,
      hierarchy: vaHierarchy,
      comprehension,
      sequenceNumber: 2,
      questionType: QuestionType.MCQ,
      question: "In the passage, the word 'mechanical' most nearly means:",
      options: [
        { id: "A", text: "Automatic and lacking thought" },
        { id: "B", text: "Highly emotional" },
        { id: "C", text: "Unusually expensive" },
        { id: "D", text: "Physically tiring" },
      ],
      correctAnswers: ["A"],
      explanation: "Here, mechanical means routine or automatic in a way that lacks meaningful engagement.",
    },
  ];

  for (const item of questionData) {
    await prisma.mockQuestion.upsert({
      where: {
        mockSectionId_sequenceNumber: {
          mockSectionId: item.section.id,
          sequenceNumber: item.sequenceNumber,
        },
      },
      update: {
        mockComprehensionId: item.comprehension?.id ?? null,
        topicId: item.hierarchy.topic.id,
        subtopicId: item.hierarchy.subtopic.id,
        difficultyId: difficulty.id,
        questionType: item.questionType,
        question: item.question,
        options: item.options,
        correctAnswers: item.correctAnswers,
        positiveMarks: "4",
        negativeMarks: "1",
        explanation: item.explanation,
        imageUrl: null,
        isActive: true,
        updatedById: admin.id,
      },
      create: {
        mockSectionId: item.section.id,
        mockComprehensionId: item.comprehension?.id ?? null,
        topicId: item.hierarchy.topic.id,
        subtopicId: item.hierarchy.subtopic.id,
        difficultyId: difficulty.id,
        sequenceNumber: item.sequenceNumber,
        questionType: item.questionType,
        question: item.question,
        options: item.options,
        correctAnswers: item.correctAnswers,
        positiveMarks: "4",
        negativeMarks: "1",
        explanation: item.explanation,
        imageUrl: null,
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  await prisma.mockAttemptAnalytics.upsert({
    where: { mockExamId: mockExam.id },
    update: {
      totalAttempts: 0,
      averageScore: "0",
      averageAccuracy: "0",
      averageTimeTaken: 0,
      averageRank: "0",
      averagePercentile: "0",
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      totalUnattemptedAnswers: 0,
    },
    create: {
      mockExamId: mockExam.id,
      totalAttempts: 0,
      averageScore: "0",
      averageAccuracy: "0",
      averageTimeTaken: 0,
      averageRank: "0",
      averagePercentile: "0",
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      totalUnattemptedAnswers: 0,
    },
  });

  for (const section of [qaSection, lrSection, vaSection]) {
    await prisma.mockSectionAnalytics.upsert({
      where: { mockSectionId: section.id },
      update: {
        totalAttempts: 0,
        averageScore: "0",
        averageAccuracy: "0",
        averageTimeTaken: 0,
        totalCorrectAnswers: 0,
        totalIncorrectAnswers: 0,
        totalUnattemptedAnswers: 0,
      },
      create: {
        mockSectionId: section.id,
        totalAttempts: 0,
        averageScore: "0",
        averageAccuracy: "0",
        averageTimeTaken: 0,
        totalCorrectAnswers: 0,
        totalIncorrectAnswers: 0,
        totalUnattemptedAnswers: 0,
      },
    });
  }

  const [sectionCount, questionCount] = await Promise.all([
    prisma.mockSection.count({ where: { mockExamId: mockExam.id } }),
    prisma.mockQuestion.count({ where: { mockSection: { mockExamId: mockExam.id } } }),
  ]);

  console.info("Mock test seed completed", {
    adminEmail: ADMIN_EMAIL,
    adminUsername: ADMIN_USERNAME,
    adminPassword: ADMIN_PASSWORD,
    examTypes: [ipmat.name, jipmat.name],
    mockExamTypes: [fullLengthMock.name, sectionalMock.name],
    mockExam: mockExam.name,
    sections: sectionCount,
    questions: questionCount,
  });
}

main()
  .catch((error) => {
    console.error("Mock test seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
