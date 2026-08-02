import { AdminRole, PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'superadmin@entranceug.local';
const STUDENT_ID = '431666b7-580b-4dd9-a5f1-e4d4f92085dc';

const now = new Date();
const atDay = (offset: number, hour = 9, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute, 0, 0);

const passages = [
  {
    title: 'Daily RC Test 1',
    passage: 'In many small towns, libraries have become more than quiet rooms for borrowing books. They host digital literacy classes, offer study corners for students, and provide a dependable public space where people can learn without needing to buy anything. This shift has made libraries especially important for young learners who need structure but cannot always access private coaching or expensive resources.',
    difficulty: 'Easy',
    start: atDay(-10),
    end: atDay(-9, 23, 59),
  },
  {
    title: 'Daily RC Test 2',
    passage: 'Urban planners increasingly argue that a city is not judged only by its roads and buildings, but by the ease with which ordinary people can move, rest and gather. Parks, shaded walkways and public transport can change daily life more deeply than a new mall. A successful city, in this view, is one that reduces friction for its residents.',
    difficulty: 'Medium',
    start: atDay(-5),
    end: atDay(-4, 23, 59),
  },
  {
    title: 'Daily RC Test 3',
    passage: 'The rise of short-form media has changed how readers approach long texts. Some educators worry that students now expect every idea to arrive instantly, while others argue that brief formats can introduce learners to new subjects. The real challenge may not be the format itself, but whether students are taught when to skim and when to slow down.',
    difficulty: 'Medium',
    start: atDay(-1),
    end: new Date(now.getFullYear(), now.getMonth() + 2, now.getDate(), 23, 59, 0, 0),
  },
  {
    title: 'Daily RC Test 4',
    passage: 'Scientific progress rarely follows a straight path. Experiments fail, assumptions collapse and promising ideas are revised repeatedly. Yet these failures are not interruptions to discovery; they are often the mechanism through which discovery becomes reliable. A result that survives careful criticism is stronger than one that merely sounds convincing.',
    difficulty: 'Hard',
    start: atDay(-1),
    end: new Date(now.getFullYear(), now.getMonth() + 2, now.getDate(), 23, 59, 0, 0),
  },
];

const questionBank = [
  [
    ['What is the central idea of the passage?', ['Libraries are becoming expensive institutions.', 'Libraries now support wider learning needs.', 'Students no longer borrow books.', 'Digital classes have replaced reading.'], 'B', 'The passage presents libraries as broader learning spaces beyond book lending.'],
    ['Why are libraries important for some young learners?', ['They provide private coaching.', 'They offer free structure and resources.', 'They sell affordable textbooks.', 'They replace schools.'], 'B', 'The passage emphasizes free access to study spaces and learning support.'],
    ['The tone of the passage is best described as:', ['Dismissive', 'Appreciative', 'Sarcastic', 'Alarmist'], 'B', 'The author highlights positive social and educational roles of libraries.'],
    ['Which phrase best matches “dependable public space”?', ['A costly study centre', 'A reliable shared place', 'A private classroom', 'A digital-only platform'], 'B', 'Dependable public space means a reliable place open for public use.'],
    ['What has shifted in the role of libraries?', ['They avoid students.', 'They only lend rare books.', 'They support community learning.', 'They focus on commerce.'], 'C', 'The passage describes libraries hosting classes and study support.'],
    ['Which group is specifically mentioned as benefiting?', ['Young learners', 'Shop owners', 'Publishers', 'Tourists'], 'A', 'Young learners are explicitly mentioned near the end.'],
  ],
  [
    ['According to the passage, how should a city be judged?', ['Only by its buildings', 'By malls and roads alone', 'By how easily people can live and move', 'By private vehicles'], 'C', 'The passage says cities should be judged by ease of movement, rest and gathering.'],
    ['Which feature is NOT mentioned as improving city life?', ['Parks', 'Shaded walkways', 'Public transport', 'Luxury housing'], 'D', 'Luxury housing is not listed among the public features.'],
    ['The phrase “reduces friction” means:', ['Creates traffic', 'Makes daily life easier', 'Removes laws', 'Builds more shops'], 'B', 'In context, reducing friction means lowering everyday inconvenience.'],
    ['What do planners contrast with malls?', ['Public spaces and transport', 'Factories', 'Airports', 'Universities'], 'A', 'The passage contrasts public-use infrastructure with a new mall.'],
    ['The author’s view of public infrastructure is:', ['Positive', 'Hostile', 'Uncertain', 'Mocking'], 'A', 'The passage frames parks, walkways and transport as improving daily life.'],
    ['What does “ordinary people” suggest?', ['Only experts', 'Most city residents', 'Government officials', 'Tourists only'], 'B', 'The phrase refers to regular residents using the city daily.'],
  ],
  [
    ['What concern do some educators have?', ['Students read too slowly.', 'Students expect ideas instantly.', 'Students avoid all media.', 'Students dislike new subjects.'], 'B', 'The passage directly states this concern.'],
    ['What is the author’s balanced conclusion?', ['Short-form media is always harmful.', 'Long reading is unnecessary.', 'Students need judgment about reading modes.', 'Skimming should be banned.'], 'C', 'The final sentence stresses knowing when to skim and when to slow down.'],
    ['The passage mainly discusses:', ['The economics of media companies', 'Changes in reading habits', 'The history of newspapers', 'The decline of schools'], 'B', 'It focuses on how short-form media affects reading approaches.'],
    ['Which action is defended as useful in some cases?', ['Skimming', 'Ignoring context', 'Memorising every sentence', 'Avoiding new subjects'], 'A', 'The author suggests skimming has a proper place.'],
    ['What does “format itself” refer to?', ['The teacher', 'The type of media', 'The school building', 'The exam score'], 'B', 'Format refers to short or long forms of content.'],
    ['The author’s position is best called:', ['Extreme', 'Balanced', 'Indifferent', 'Contradictory'], 'B', 'The author recognizes both concern and possible benefit.'],
  ],
  [
    ['What is the main claim of the passage?', ['Science is always quick.', 'Failed experiments can strengthen discovery.', 'Assumptions should never change.', 'Criticism prevents discovery.'], 'B', 'The passage says failures are part of reliable discovery.'],
    ['What happens to promising ideas in science?', ['They are never questioned.', 'They are revised repeatedly.', 'They become laws instantly.', 'They avoid experiments.'], 'B', 'The passage states that promising ideas are revised.'],
    ['Why is criticism valuable?', ['It makes results sound convincing.', 'It replaces experiments.', 'It tests and strengthens results.', 'It prevents progress.'], 'C', 'A result that survives criticism is described as stronger.'],
    ['The tone of the passage is:', ['Reflective', 'Comic', 'Angry', 'Confused'], 'A', 'The author thoughtfully explains how progress happens.'],
    ['Which idea does the passage reject?', ['Discovery can include failure.', 'Science is a straight path.', 'Ideas may need revision.', 'Reliable results face criticism.'], 'B', 'The first sentence says scientific progress rarely follows a straight path.'],
    ['“Mechanism” in the passage most nearly means:', ['Tool or process', 'Machine part only', 'Obstacle', 'Prediction'], 'A', 'Here it means the process through which discovery becomes reliable.'],
  ],
];

async function ensureDifficulty(adminId: string, name: string, displayOrder: number) {
  const existing = await prisma.difficultyLevel.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.difficultyLevel.create({
    data: {
      name,
      description: `${name} RC practice difficulty.`,
      displayOrder,
      createdById: adminId,
      updatedById: adminId,
    },
  });
}

async function ensureRcTest(adminId: string, difficultyId: string, seed: typeof passages[number]) {
  const existing = await prisma.rcTest.findFirst({ where: { title: seed.title } });
  const data = {
    passage: seed.passage,
    instructions: 'Read the passage carefully and answer all six questions. Each correct answer carries 4 marks and each incorrect answer carries 1 negative mark.',
    startDatetime: seed.start,
    endDatetime: seed.end,
    durationMinutes: 20,
    difficultyId,
    totalMarks: '24',
    isActive: true,
    updatedById: adminId,
  };
  if (existing) return prisma.rcTest.update({ where: { id: existing.id }, data });
  return prisma.rcTest.create({ data: { title: seed.title, ...data, createdById: adminId } });
}

async function main() {
  const admin = await prisma.admin.findFirst({ where: { role: AdminRole.SUPER_ADMIN }, orderBy: { createdAt: 'asc' } });
  if (!admin) throw new Error('A SUPER_ADMIN is required before seeding RC data.');

  const student = await prisma.student.findUnique({ where: { id: STUDENT_ID }, select: { id: true } });
  if (!student) throw new Error(`Missing student ${STUDENT_ID}.`);

  const difficulties = await Promise.all([
    ensureDifficulty(admin.id, 'Easy', 1),
    ensureDifficulty(admin.id, 'Medium', 2),
    ensureDifficulty(admin.id, 'Hard', 3),
  ]);
  const byName = Object.fromEntries(difficulties.map((difficulty) => [difficulty.name, difficulty]));

  for (const [testIndex, seed] of passages.entries()) {
    const difficulty = byName[seed.difficulty] ?? difficulties[0];
    const test = await ensureRcTest(admin.id, difficulty.id, seed);

    for (const [index, [question, options, correct, explanation]] of questionBank[testIndex].entries()) {
      await prisma.rcQuestion.upsert({
        where: { rcTestId_sequenceNumber: { rcTestId: test.id, sequenceNumber: index + 1 } },
        update: {
          question,
          questionType: QuestionType.MCQ,
          options: options.map((text, optionIndex) => ({ id: String.fromCharCode(65 + optionIndex), text })),
          correctAnswers: [correct],
          positiveMarks: '4',
          negativeMarks: '1',
          explanation,
        },
        create: {
          rcTestId: test.id,
          sequenceNumber: index + 1,
          question,
          questionType: QuestionType.MCQ,
          options: options.map((text, optionIndex) => ({ id: String.fromCharCode(65 + optionIndex), text })),
          correctAnswers: [correct],
          positiveMarks: '4',
          negativeMarks: '1',
          explanation,
        },
      });
    }

    await prisma.rcQuestion.deleteMany({ where: { rcTestId: test.id, sequenceNumber: { gt: 6 } } });
  }

  await prisma.rcLeaderboard.upsert({
    where: { studentId: STUDENT_ID },
    update: {
      currentStreak: 3,
      highestStreak: 150,
      totalRcAttempted: 186,
      averageScore: '82.75',
      lastCompletedDate: atDay(-1),
    },
    create: {
      studentId: STUDENT_ID,
      currentStreak: 3,
      highestStreak: 150,
      totalRcAttempted: 186,
      averageScore: '82.75',
      lastCompletedDate: atDay(-1),
    },
  });

  console.info('RC seed completed', { tests: passages.length, questions: 24, leaderboardStudentId: STUDENT_ID });
}

main()
  .catch((error) => {
    console.error('RC seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
