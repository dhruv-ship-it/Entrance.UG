import bcrypt from 'bcryptjs';
import { Prisma, type AdminRole } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';
import { signAccessToken } from '../../shared/auth/jwt.js';
import type { AuthRole } from '../../shared/auth/auth.types.js';
import type { LoginInput, SignupInput } from './auth.schemas.js';

const passwordRounds = 12;

type Account = {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string;
  isActive: boolean;
  profileImage?: string | null;
  role?: AdminRole;
};

const serializeAccount = (account: Account, role: AuthRole) => ({
  id: account.id,
  name: account.name,
  username: account.username,
  email: account.email,
  emailVerified: account.emailVerified,
  role,
  profileImage: account.profileImage ?? null,
  adminRole: account.role ?? null,
});

export const registerStudent = async (input: SignupInput) => {
  const [usernameTaken, emailTaken, phoneTaken] = await prisma.$transaction([
    prisma.student.findUnique({ where: { username: input.username }, select: { id: true } }),
    prisma.student.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.student.findUnique({ where: { phoneNumber: input.phoneNumber }, select: { id: true } }),
  ]);

  if (usernameTaken || emailTaken || phoneTaken) {
    throw new AppError(409, 'An account with this username, email or phone number already exists.');
  }

  // Never spread a transport DTO directly into a persistence call. This keeps
  // credentials and future request-only fields out of the database payload.
  const { password, ...studentInput } = input;
  const passwordHash = await bcrypt.hash(password, passwordRounds);
  const studentData: Prisma.StudentCreateInput = { ...studentInput, passwordHash };
  const student = await prisma.student.create({
    data: studentData,
    select: { id: true, name: true, username: true, email: true, emailVerified: true, profileImage: true, isActive: true, passwordHash: true },
  });

  const user = serializeAccount(student, 'STUDENT');
  return { user, accessToken: signAccessToken({ sub: student.id, role: 'STUDENT' }) };
};

const findAccount = async (role: AuthRole, username: string): Promise<Account | null> => {
  switch (role) {
    case 'STUDENT': return prisma.student.findUnique({ where: { username }, select: { id: true, name: true, username: true, email: true, emailVerified: true, passwordHash: true, isActive: true, profileImage: true } });
    case 'PARENT': return prisma.parent.findUnique({ where: { username }, select: { id: true, name: true, username: true, email: true, emailVerified: true, passwordHash: true, isActive: true } });
    case 'MENTOR': return prisma.mentor.findUnique({ where: { username }, select: { id: true, name: true, username: true, email: true, emailVerified: true, passwordHash: true, isActive: true, profileImage: true } });
    case 'ADMIN': return prisma.admin.findUnique({ where: { username }, select: { id: true, name: true, username: true, email: true, emailVerified: true, passwordHash: true, isActive: true, role: true } });
  }
};

export const login = async ({ role, username, password }: LoginInput) => {
  const account = await findAccount(role, username);
  if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
    throw new AppError(401, 'Invalid username, password, or account type.');
  }
  if (!account.isActive) {
    throw new AppError(403, 'This account is inactive. Please contact support.');
  }

  const now = new Date();
  await Promise.all([
    role === 'STUDENT' ? prisma.student.update({ where: { id: account.id }, data: { lastLoginAt: now, lastSeenAt: now } }) : Promise.resolve(),
    role === 'PARENT' ? prisma.parent.update({ where: { id: account.id }, data: { lastLoginAt: now } }) : Promise.resolve(),
    role === 'MENTOR' ? prisma.mentor.update({ where: { id: account.id }, data: { lastLoginAt: now } }) : Promise.resolve(),
    role === 'ADMIN' ? prisma.admin.update({ where: { id: account.id }, data: { lastLoginAt: now } }) : Promise.resolve(),
  ]);

  const user = serializeAccount(account, role);
  return { user, accessToken: signAccessToken({ sub: account.id, role, adminRole: account.role }) };
};

export const getCurrentUser = async (id: string, role: AuthRole) => {
  const record = role === 'STUDENT'
    ? await prisma.student.findUnique({ where: { id }, select: { id: true, name: true, username: true, email: true, emailVerified: true, profileImage: true, isActive: true, passwordHash: true } })
    : role === 'PARENT'
      ? await prisma.parent.findUnique({ where: { id }, select: { id: true, name: true, username: true, email: true, emailVerified: true, isActive: true, passwordHash: true } })
      : role === 'MENTOR'
        ? await prisma.mentor.findUnique({ where: { id }, select: { id: true, name: true, username: true, email: true, emailVerified: true, profileImage: true, isActive: true, passwordHash: true } })
        : await prisma.admin.findUnique({ where: { id }, select: { id: true, name: true, username: true, email: true, emailVerified: true, isActive: true, passwordHash: true, role: true } });

  if (!record || !record.isActive) throw new AppError(401, 'Your session is no longer valid.');
  return serializeAccount(record, role);
};
