import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertPlan(input: {
  name: string;
  description: string;
  originalPrice: string;
  sellingPrice: string;
  durationDays: number;
  isContentIncluded: boolean;
  displayOrder: number;
  adminId: string;
}) {
  return prisma.plan.upsert({
    where: { name: input.name },
    update: {
      description: input.description,
      originalPrice: input.originalPrice,
      sellingPrice: input.sellingPrice,
      durationDays: input.durationDays,
      isContentIncluded: input.isContentIncluded,
      isActive: true,
      displayOrder: input.displayOrder,
      updatedById: input.adminId,
    },
    create: {
      name: input.name,
      description: input.description,
      originalPrice: input.originalPrice,
      sellingPrice: input.sellingPrice,
      durationDays: input.durationDays,
      isContentIncluded: input.isContentIncluded,
      isActive: true,
      displayOrder: input.displayOrder,
      createdById: input.adminId,
      updatedById: input.adminId,
    },
  });
}

async function syncPlanLinks(planId: string, examTypeIds: string[], mentorshipProgramIds: string[]) {
  await prisma.$transaction([
    prisma.planMockExam.deleteMany({ where: { planId, examTypeId: { notIn: examTypeIds } } }),
    prisma.planMentorshipProgram.deleteMany({ where: { planId, mentorshipProgramId: { notIn: mentorshipProgramIds } } }),
    ...examTypeIds.map((examTypeId) => prisma.planMockExam.upsert({
      where: { planId_examTypeId: { planId, examTypeId } },
      update: {},
      create: { planId, examTypeId },
    })),
    ...mentorshipProgramIds.map((mentorshipProgramId) => prisma.planMentorshipProgram.upsert({
      where: { planId_mentorshipProgramId: { planId, mentorshipProgramId } },
      update: {},
      create: { planId, mentorshipProgramId },
    })),
  ]);
}

async function main() {
  const admin = await prisma.admin.findFirst({ where: { role: 'SUPER_ADMIN', isActive: true }, orderBy: { createdAt: 'asc' } });
  if (!admin) throw new Error('No active SUPER_ADMIN found.');

  const examType = await prisma.examType.findFirst({
    where: { isActive: true, mockExams: { some: { isActive: true } } },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { mockExams: true } } },
  });
  if (!examType) throw new Error('No active exam type with mock exams found. Seed mock tests first.');

  const mentorshipProgram = await prisma.mentorshipProgram.findFirst({
    where: { isActive: true, batches: { some: { isActive: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!mentorshipProgram) throw new Error('No active mentorship program with batches found. Seed mentorship first.');

  const plans = [
    await upsertPlan({
      name: `${mentorshipProgram.name} Starter`,
      description: `Access one guided mentorship program: ${mentorshipProgram.name}. Best for students who want batch tasks, live sessions, doubts and mentor-led structure.`,
      originalPrice: '7999',
      sellingPrice: '4999',
      durationDays: 90,
      isContentIncluded: false,
      displayOrder: 10,
      adminId: admin.id,
    }),
    await upsertPlan({
      name: `${examType.name} Mock Test Pack`,
      description: `Unlock the complete ${examType.name} mock test library. Best for students focused on exam simulation and analysis.`,
      originalPrice: '2999',
      sellingPrice: '1499',
      durationDays: 60,
      isContentIncluded: false,
      displayOrder: 20,
      adminId: admin.id,
    }),
    await upsertPlan({
      name: `${examType.name} Complete Prep Bundle`,
      description: `A complete preparation bundle with paid learning content, complete ${examType.name} mock access and ${mentorshipProgram.name} mentorship.`,
      originalPrice: '14999',
      sellingPrice: '8999',
      durationDays: 180,
      isContentIncluded: true,
      displayOrder: 30,
      adminId: admin.id,
    }),
  ];

  await syncPlanLinks(plans[0].id, [], [mentorshipProgram.id]);
  await syncPlanLinks(plans[1].id, [examType.id], []);
  await syncPlanLinks(plans[2].id, [examType.id], [mentorshipProgram.id]);

  console.log('Seeded plans:');
  plans.forEach((plan) => console.log(`- ${plan.name}: ₹${plan.sellingPrice}`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
