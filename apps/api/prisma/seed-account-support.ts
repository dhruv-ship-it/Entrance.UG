import { NoticePriority, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const parentCredentials = {
  name: 'Demo Parent',
  username: 'parent_demo',
  email: 'parent.demo@entranceug.local',
  phoneNumber: '+919900000001',
  password: '1234567890',
};

async function main() {
  const admin = await prisma.admin.findFirst({
    where: { role: 'SUPER_ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!admin) throw new Error('No active SUPER_ADMIN found. Seed/admin setup is required first.');

  const passwordHash = await bcrypt.hash(parentCredentials.password, 12);
  await prisma.parent.upsert({
    where: { username: parentCredentials.username },
    update: {
      name: parentCredentials.name,
      email: parentCredentials.email,
      phoneNumber: parentCredentials.phoneNumber,
      passwordHash,
      occupation: 'Guardian',
      isActive: true,
    },
    create: {
      name: parentCredentials.name,
      username: parentCredentials.username,
      email: parentCredentials.email,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      phoneNumber: parentCredentials.phoneNumber,
      passwordHash,
      occupation: 'Guardian',
      isActive: true,
    },
  });

  const startDatetime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endDatetime = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const existingNotice = await prisma.dashboardNotification.findFirst({ where: { title: 'Welcome to your Entrance UG dashboard' } });
  if (existingNotice) {
    await prisma.dashboardNotification.update({
      where: { id: existingNotice.id },
      data: {
        description: 'Your mock tests, learning content, mentorship updates and RC practice now come together in one student workspace.',
        priority: NoticePriority.MEDIUM,
        startDatetime,
        endDatetime,
        isActive: true,
        updatedById: admin.id,
      },
    });
  } else {
    await prisma.dashboardNotification.create({
      data: {
        title: 'Welcome to your Entrance UG dashboard',
        description: 'Your mock tests, learning content, mentorship updates and RC practice now come together in one student workspace.',
        priority: NoticePriority.MEDIUM,
        startDatetime,
        endDatetime,
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  console.log('Seeded account support data.');
  console.log(`Parent username: ${parentCredentials.username}`);
  console.log(`Parent password: ${parentCredentials.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
