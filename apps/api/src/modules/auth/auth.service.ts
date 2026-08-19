import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { EmailVerificationPurpose, Prisma, VerificationAccountRole, type AdminRole } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';
import { signAccessToken } from '../../shared/auth/jwt.js';
import { sendOtpEmail } from '../../shared/email/email.service.js';
import type { AuthRole } from '../../shared/auth/auth.types.js';
import type { ForgotPasswordRequestInput, ForgotPasswordResetInput, LoginInput, ParentSignupInput, SignupInput } from './auth.schemas.js';

const passwordRounds = 12;

type Account = {
  id: string;
  name: string;
  username: string;
  email: string | null;
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
  const [usernameTaken, emailTaken, phoneTaken] = await Promise.all([
    prisma.student.findUnique({ where: { username: input.username }, select: { id: true } }),
    input.email ? prisma.student.findUnique({ where: { email: input.email }, select: { id: true } }) : Promise.resolve(null),
    prisma.student.findUnique({ where: { phoneNumber: input.phoneNumber }, select: { id: true } }),
  ]);

  if (usernameTaken || emailTaken || phoneTaken) {
    throw new AppError(409, 'An account with this username, email or phone number already exists.');
  }

  // Never spread a transport DTO directly into a persistence call. This keeps
  // credentials and future request-only fields out of the database payload.
  const { password, ...studentInput } = input;
  const passwordHash = await bcrypt.hash(password, passwordRounds);
  const studentData: Prisma.StudentCreateInput = { ...studentInput, emailVerified: false, emailVerifiedAt: null, passwordHash };
  const { student, verification } = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: studentData,
      select: { id: true, name: true, username: true, email: true, emailVerified: true, profileImage: true, isActive: true, passwordHash: true },
    });
    if (!created.email) return { student: created, verification: null };
    const createdVerification = await createEmailVerification(tx, created.email, EmailVerificationPurpose.REGISTER, created.id, VerificationAccountRole.STUDENT);
    return { student: created, verification: createdVerification };
  });

  const deliveredVerification = verification
    ? await deliverVerificationOtp(verification, 'Verify your Entrance UG email', 'Verify your email address', 'Use this OTP to verify the email attached to your Entrance UG student account.')
    : null;
  const user = serializeAccount(student, 'STUDENT');
  return { user, accessToken: signAccessToken({ sub: student.id, role: 'STUDENT' }), verification: deliveredVerification };
};

export const registerParent = async (input: ParentSignupInput) => {
  const [usernameTaken, emailTaken, phoneTaken] = await Promise.all([
    prisma.parent.findUnique({ where: { username: input.username }, select: { id: true } }),
    prisma.parent.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.parent.findUnique({ where: { phoneNumber: input.phoneNumber }, select: { id: true } }),
  ]);

  if (usernameTaken || emailTaken || phoneTaken) {
    throw new AppError(409, 'A parent account with this username, email or phone number already exists.');
  }

  const { password, ...parentInput } = input;
  const passwordHash = await bcrypt.hash(password, passwordRounds);
  const { parent, verification } = await prisma.$transaction(async (tx) => {
    const created = await tx.parent.create({
      data: { ...parentInput, emailVerified: false, emailVerifiedAt: null, passwordHash },
      select: { id: true, name: true, username: true, email: true, emailVerified: true, isActive: true, passwordHash: true },
    });
    const createdVerification = await createEmailVerification(tx, created.email, EmailVerificationPurpose.REGISTER, created.id, VerificationAccountRole.PARENT);
    return { parent: created, verification: createdVerification };
  });

  const deliveredVerification = await deliverVerificationOtp(
    verification,
    'Verify your Entrance UG parent email',
    'Verify your parent account email',
    'Use this OTP to verify the email attached to your Entrance UG parent account.',
  );
  const user = serializeAccount(parent, 'PARENT');
  return { user, accessToken: signAccessToken({ sub: parent.id, role: 'PARENT' }), verification: deliveredVerification };
};

const createEmailVerification = async (tx: Prisma.TransactionClient, email: string, purpose: EmailVerificationPurpose, accountId: string, accountRole: VerificationAccountRole) => {
  const otp = String(randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, passwordRounds);
  await tx.emailVerification.create({
    data: { email, otpHash, purpose, accountId, accountRole, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  return { email, otp, expiresInMinutes: 10 };
};

const deliverVerificationOtp = async (verification: { email: string; otp: string; expiresInMinutes: number }, subject: string, heading: string, intro: string) => {
  const delivery = await sendOtpEmail({ to: verification.email, subject, heading, intro, otp: verification.otp });
  return { email: verification.email, devOtp: delivery.devOtp, expiresInMinutes: verification.expiresInMinutes };
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

export const requestForgotPassword = async ({ role, username }: ForgotPasswordRequestInput) => {
  const account = await findAccount(role, username);
  if (!account || !account.isActive || !account.email || !account.emailVerified) {
    return { message: forgotPasswordMessage, devOtp: null };
  }

  const verification = await prisma.$transaction((tx) => createEmailVerification(tx, account.email!, EmailVerificationPurpose.FORGOT_PASSWORD, account.id, toVerificationAccountRole(role)));
  const delivery = await sendOtpEmail({
    to: verification.email,
    subject: 'Reset your Entrance UG password',
    heading: 'Reset your password',
    intro: 'Use this OTP to reset your Entrance UG password. Your username login will remain the same.',
    otp: verification.otp,
  });

  return { message: forgotPasswordMessage, devOtp: delivery.devOtp };
};

export const resetForgotPassword = async ({ role, username, otp, password }: ForgotPasswordResetInput) => {
  const account = await findAccount(role, username);
  if (!account || !account.isActive || !account.email || !account.emailVerified) {
    throw new AppError(400, 'Invalid or expired reset code.');
  }

  const accountRole = toVerificationAccountRole(role);
  const record = await prisma.emailVerification.findFirst({
    where: {
      email: account.email,
      purpose: EmailVerificationPurpose.FORGOT_PASSWORD,
      accountId: account.id,
      accountRole,
      verifiedAt: null,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw new AppError(400, 'Invalid or expired reset code.');
  if (!(await bcrypt.compare(otp, record.otpHash))) throw new AppError(400, 'Invalid or expired reset code.');

  const passwordHash = await bcrypt.hash(password, passwordRounds);
  const now = new Date();
  await prisma.$transaction([
    updateAccountPassword(role, account.id, passwordHash),
    prisma.emailVerification.update({ where: { id: record.id }, data: { verifiedAt: now } }),
    prisma.emailVerification.updateMany({
      where: { accountId: account.id, accountRole, purpose: EmailVerificationPurpose.FORGOT_PASSWORD, verifiedAt: null },
      data: { verifiedAt: now },
    }),
  ]);

  return { message: 'Password has been reset. You can sign in with your new password.' };
};

const forgotPasswordMessage = 'If a verified email exists for this account, a reset OTP has been sent.';

const toVerificationAccountRole = (role: AuthRole): VerificationAccountRole => {
  switch (role) {
    case 'STUDENT': return VerificationAccountRole.STUDENT;
    case 'PARENT': return VerificationAccountRole.PARENT;
    case 'MENTOR': return VerificationAccountRole.MENTOR;
    case 'ADMIN': return VerificationAccountRole.ADMIN;
  }
};

const updateAccountPassword = (role: AuthRole, id: string, passwordHash: string) => {
  switch (role) {
    case 'STUDENT': return prisma.student.update({ where: { id }, data: { passwordHash } });
    case 'PARENT': return prisma.parent.update({ where: { id }, data: { passwordHash } });
    case 'MENTOR': return prisma.mentor.update({ where: { id }, data: { passwordHash } });
    case 'ADMIN': return prisma.admin.update({ where: { id }, data: { passwordHash } });
  }
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
