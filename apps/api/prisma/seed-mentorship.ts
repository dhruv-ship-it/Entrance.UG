import { PrismaClient, QuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'superadmin@entranceug.local';
const STUDENT_ID = '431666b7-580b-4dd9-a5f1-e4d4f92085dc';
const farFuture = new Date('2099-12-31T00:00:00.000Z');
const now = new Date();
const days = (offset: number, hour = 18) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 0, 0);

const ensureProgram = (adminId: string, name: string, description: string) => prisma.mentorshipProgram.upsert({ where: { name }, update: { description, isActive: true, updatedById: adminId }, create: { name, description, isActive: true, createdById: adminId, updatedById: adminId } });
const ensureBatch = (adminId: string, programId: string, name: string, description: string, maximumStudents: number) => prisma.mentorshipBatch.upsert({ where: { mentorshipProgramId_name: { mentorshipProgramId: programId, name } }, update: { description, maximumStudents, isActive: true, updatedById: adminId }, create: { mentorshipProgramId: programId, name, description, maximumStudents, isActive: true, createdById: adminId, updatedById: adminId } });

async function ensureMentor(adminId: string, input: { name: string; username: string; email: string; phoneNumber: string; qualification: string; experienceYears: number; bio: string }) {
  const passwordHash = await bcrypt.hash('Mentor@12345', 12);
  return prisma.mentor.upsert({ where: { email: input.email }, update: { ...input, passwordHash, emailVerified: true, isActive: true, updatedById: adminId }, create: { ...input, passwordHash, emailVerified: true, emailVerifiedAt: now, isActive: true, createdById: adminId, updatedById: adminId } });
}

async function ensureAssignment(adminId: string, mentorId: string, batchId: string) {
  return prisma.mentorBatchAssignment.upsert({ where: { mentorId_mentorshipBatchId: { mentorId, mentorshipBatchId: batchId } }, update: { assignedById: adminId, removedAt: null, isActive: true }, create: { mentorId, mentorshipBatchId: batchId, assignedById: adminId, isActive: true } });
}

async function ensureTask(mentorId: string, batchId: string, title: string, description: string, startDatetime: Date, endDatetime: Date) {
  const existing = await prisma.batchTask.findFirst({ where: { mentorshipBatchId: batchId, title } });
  const data = { description, attachmentUrl: null, startDatetime, endDatetime, updatedById: mentorId };
  return existing ? prisma.batchTask.update({ where: { id: existing.id }, data }) : prisma.batchTask.create({ data: { mentorshipBatchId: batchId, title, ...data, createdById: mentorId } });
}

async function ensureNotice(mentorId: string, batchId: string, title: string, description: string) {
  const existing = await prisma.batchNotice.findFirst({ where: { mentorshipBatchId: batchId, title } });
  return existing ? prisma.batchNotice.update({ where: { id: existing.id }, data: { description, attachmentUrl: null, updatedByMentorId: mentorId, updatedByAdminId: null } }) : prisma.batchNotice.create({ data: { mentorshipBatchId: batchId, title, description, attachmentUrl: null, createdByMentorId: mentorId, createdByAdminId: null, updatedByMentorId: mentorId, updatedByAdminId: null } });
}

async function ensureSession(mentorId: string, batchId: string, title: string, description: string, startDatetime: Date, endDatetime: Date) {
  const existing = await prisma.liveSession.findFirst({ where: { mentorshipBatchId: batchId, title } });
  const data = { description, meetingLink: `https://meet.google.com/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`, startDatetime, endDatetime, createdById: mentorId };
  return existing ? prisma.liveSession.update({ where: { id: existing.id }, data }) : prisma.liveSession.create({ data: { mentorshipBatchId: batchId, title, ...data } });
}

async function ensureTest(mentorId: string, batchId: string, difficultyId: string, name: string, description: string, startDatetime = days(-1), endDatetime = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59)) {
  const existing = await prisma.batchTest.findFirst({ where: { mentorshipBatchId: batchId, name } });
  const data = { description, instructions: 'Attempt every question. Answers are saved automatically. Negative marking applies to incorrect responses.', difficultyId, durationMinutes: 30, totalMarks: '12', canGoBackBetweenSections: true, isActive: true, startDatetime, endDatetime, updatedByMentorId: mentorId, updatedByAdminId: null };
  return existing ? prisma.batchTest.update({ where: { id: existing.id }, data }) : prisma.batchTest.create({ data: { mentorshipBatchId: batchId, name, ...data, createdByMentorId: mentorId, createdByAdminId: null } });
}

async function ensureSections(mentorId: string, testId: string) {
  const seeds = [
    { sequenceNumber: 1, name: 'Quantitative Aptitude', instructions: 'Solve the quantitative questions.', durationMinutes: 15, totalMarks: '6' },
    { sequenceNumber: 2, name: 'Reasoning and Verbal Ability', instructions: 'Solve the reasoning and verbal questions.', durationMinutes: 15, totalMarks: '6' },
  ];
  return Promise.all(seeds.map((seed) => prisma.batchSection.upsert({ where: { batchTestId_sequenceNumber: { batchTestId: testId, sequenceNumber: seed.sequenceNumber } }, update: { ...seed, canGoBackToPreviousQuestion: true, updatedByMentorId: mentorId, updatedByAdminId: null }, create: { batchTestId: testId, ...seed, canGoBackToPreviousQuestion: true, createdByMentorId: mentorId, createdByAdminId: null, updatedByMentorId: mentorId, updatedByAdminId: null } })));
}

async function main() {
  const admin = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error(`Missing ${ADMIN_EMAIL}.`);
  const student = await prisma.student.findUnique({ where: { id: STUDENT_ID }, select: { id: true } });
  if (!student) throw new Error(`Missing student ${STUDENT_ID}.`);
  const difficulty = await prisma.difficultyLevel.findFirst({ orderBy: { displayOrder: 'asc' } });
  if (!difficulty) throw new Error('No difficulty level exists.');
  const hierarchy = await prisma.subtopic.findFirst({ include: { topic: { include: { subject: true } } }, orderBy: { displayOrder: 'asc' } });
  if (!hierarchy) throw new Error('No subject/topic/subtopic hierarchy exists.');

  const [ipmat, jipmat, cuet] = await Promise.all([
    ensureProgram(admin.id, 'IPMAT Premium Mentorship', 'Complete IPMAT preparation program with guided practice, mentoring and batch tests.'),
    ensureProgram(admin.id, 'JIPMAT Premium Mentorship', 'Complete JIPMAT preparation program with structured mentoring and practice.'),
    ensureProgram(admin.id, 'CUET Premium Mentorship', 'Complete CUET preparation program with guided learning and assessments.'),
  ]);
  const [rahul, priya, ankit] = await Promise.all([
    ensureMentor(admin.id, { name: 'Rahul Sharma', username: 'mentor_rahul', email: 'rahul.sharma@entranceug.local', phoneNumber: '+919810000101', qualification: 'MBA, IIM Indore', experienceYears: 8, bio: 'Quantitative Aptitude mentor focused on clear concepts and efficient problem solving.' }),
    ensureMentor(admin.id, { name: 'Priya Verma', username: 'mentor_priya', email: 'priya.verma@entranceug.local', phoneNumber: '+919810000102', qualification: 'MBA, IIM Rohtak', experienceYears: 7, bio: 'Logical Reasoning mentor who teaches structured analytical approaches.' }),
    ensureMentor(admin.id, { name: 'Ankit Gupta', username: 'mentor_ankit', email: 'ankit.gupta@entranceug.local', phoneNumber: '+919810000103', qualification: 'MA English', experienceYears: 9, bio: 'Verbal Ability mentor specialising in reading comprehension and communication.' }),
  ]);
  const [hausla, udaan, pratigya] = await Promise.all([
    ensureBatch(admin.id, ipmat.id, 'Hausla Batch', 'A focused IPMAT cohort building confidence through consistent guided practice.', 50),
    ensureBatch(admin.id, ipmat.id, 'Udaan Batch', 'An IPMAT cohort designed for steady, concept-first preparation.', 50),
    ensureBatch(admin.id, ipmat.id, 'Pratigya Batch', 'An intensive IPMAT cohort with collaborative mentoring, tasks and regular tests.', 100),
  ]);
  await Promise.all([ensureAssignment(admin.id, rahul.id, hausla.id), ensureAssignment(admin.id, priya.id, udaan.id), ensureAssignment(admin.id, rahul.id, pratigya.id), ensureAssignment(admin.id, ankit.id, pratigya.id)]);
  await Promise.all([
    ensureTask(rahul.id, pratigya.id, 'Arithmetic Practice Sheet', 'Solve all assigned arithmetic questions before the deadline and note any doubts for the next live session.', days(-7, 9), days(-1, 23)),
    ensureTask(ankit.id, pratigya.id, 'Percentage Assignment', 'Complete the percentage worksheet and revise the worked examples before submitting.', days(-1, 9), days(7, 23)),
    ensureNotice(rahul.id, pratigya.id, 'Welcome to Pratigya Batch', 'Welcome to the batch. Please review the learning plan, introduce yourself during the next live session, and keep your doubts organised.'),
    ensureNotice(ankit.id, pratigya.id, 'Weekly practice schedule uploaded', 'The weekly practice schedule has been uploaded. Complete the arithmetic task first, then attempt the active batch tests.'),
    ensureSession(rahul.id, pratigya.id, 'Arithmetic Revision', 'A revision session covering core arithmetic methods and common calculation shortcuts.', days(-5, 18), days(-5, 19)),
    ensureSession(priya.id, pratigya.id, 'Logical Reasoning Marathon', 'A guided logical reasoning practice session with arrangements and deduction techniques.', days(-2, 18), days(-2, 19, 30)),
    ensureSession(ankit.id, pratigya.id, 'Weekly Live Mentoring', 'An open mentoring session for strategy, progress reviews and student doubts.', days(-1, 18), days(7, 19)),
  ]);
  const tests = await Promise.all([
    ensureTest(rahul.id, pratigya.id, difficulty.id, 'Batch Test 1', 'A closed practice test covering foundational quantitative and reasoning skills.', days(-20, 10), days(-19, 23)),
    ensureTest(priya.id, pratigya.id, difficulty.id, 'Batch Test 2', 'A closed practice test for arithmetic and logical reasoning revision.', days(-12, 10), days(-11, 23)),
    ensureTest(ankit.id, pratigya.id, difficulty.id, 'Batch Test 3', 'An active mixed-skills practice test for the current study cycle.'),
    ensureTest(rahul.id, pratigya.id, difficulty.id, 'Batch Test 4', 'An active sectional-style test focused on speed and accuracy.'),
    ensureTest(priya.id, pratigya.id, difficulty.id, 'Batch Test 5', 'An active mentoring checkpoint test for weekly progress review.'),
  ]);
  const questionSeeds = [
    ['What is 25% of 480?', ['100', '110', '120', '130'], 'C', '25% is one-fourth, and one-fourth of 480 is 120.'],
    ['If a number is increased by 20% and becomes 360, what was the original number?', ['280', '300', '320', '340'], 'B', 'The original number is 360 divided by 1.2, which is 300.'],
    ['The average of 18, 24 and 30 is:', ['22', '24', '26', '28'], 'B', 'The sum is 72; dividing by 3 gives 24.'],
    ['In a line, A is immediately before B. If B is fifth, A is:', ['Third', 'Fourth', 'Sixth', 'Seventh'], 'B', 'A must be immediately before the fifth position, so it is fourth.'],
    ['Choose the closest meaning of “concise”.', ['Lengthy', 'Brief', 'Unclear', 'Emotional'], 'B', 'Concise means brief while still communicating the required meaning.'],
    ['Every scholar is a reader. Some readers are writers. Which statement is definitely true?', ['All writers are scholars', 'Some scholars are writers', 'All scholars are readers', 'No reader is a writer'], 'C', 'The first statement directly establishes that all scholars are readers.'],
  ];
  for (const [testIndex, test] of tests.entries()) {
    const owner = [rahul, priya, ankit, rahul, priya][testIndex];
    const sections = await ensureSections(owner.id, test.id);
    for (let sectionIndex = 0; sectionIndex < 2; sectionIndex += 1) {
      for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
        const [question, choices, correct, explanation] = questionSeeds[sectionIndex * 3 + questionIndex];
        await prisma.batchQuestion.upsert({ where: { batchSectionId_sequenceNumber: { batchSectionId: sections[sectionIndex].id, sequenceNumber: questionIndex + 1 } }, update: { topicId: hierarchy.topicId, subtopicId: hierarchy.id, difficultyId: difficulty.id, questionType: QuestionType.MCQ, question, options: choices.map((text, index) => ({ id: String.fromCharCode(65 + index), text })), correctAnswers: [correct], positiveMarks: '2', negativeMarks: '0.5', explanation, imageUrl: null, isActive: true, updatedByMentorId: owner.id, updatedByAdminId: null }, create: { batchSectionId: sections[sectionIndex].id, topicId: hierarchy.topicId, subtopicId: hierarchy.id, difficultyId: difficulty.id, sequenceNumber: questionIndex + 1, questionType: QuestionType.MCQ, question, options: choices.map((text, index) => ({ id: String.fromCharCode(65 + index), text })), correctAnswers: [correct], positiveMarks: '2', negativeMarks: '0.5', explanation, imageUrl: null, isActive: true, createdByMentorId: owner.id, createdByAdminId: null, updatedByMentorId: owner.id, updatedByAdminId: null } });
      }
    }
  }
  for (const batch of [hausla, udaan, pratigya]) await prisma.$executeRaw`INSERT INTO "student_batch_access" ("id", "student_id", "mentorship_batch_id", "purchase_id", "access_source", "joined_at", "expiry_date", "is_active", "created_at", "updated_at") SELECT gen_random_uuid(), ${STUDENT_ID}::uuid, ${batch.id}::uuid, NULL, 'ADMIN'::"AccessSource", NOW(), ${farFuture}, true, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM "student_batch_access" WHERE "student_id" = ${STUDENT_ID}::uuid AND "mentorship_batch_id" = ${batch.id}::uuid AND "purchase_id" IS NULL AND "access_source" = 'ADMIN'::"AccessSource")`;
  console.info('Mentorship seed completed', { programs: [ipmat.name, jipmat.name, cuet.name], batches: [hausla.name, udaan.name, pratigya.name], mentors: [rahul.name, priya.name, ankit.name], tests: tests.length, questions: tests.length * 6 });
}

main().catch((error) => { console.error('Mentorship seed failed', error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
