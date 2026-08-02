import { AttemptStatus, EmailVerificationPurpose, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';
import type { UpdateProfileInput } from './student.schemas.js';

const asNumber = (value: { toNumber(): number } | number | null | undefined) => value == null ? 0 : typeof value === 'number' ? value : value.toNumber();

const profileSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phoneNumber: true,
  dateOfBirth: true,
  gender: true,
  profileImage: true,
  schoolName: true,
  className: true,
  city: true,
  state: true,
  emailVerified: true,
  createdAt: true,
} as const;

export const getProfile = async (studentId: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: profileSelect });
  if (!student) throw new AppError(404, 'Student account not found.');
  return student;
};

export const updateProfile = async (studentId: string, input: UpdateProfileInput) => {
  try {
    return await prisma.student.update({ where: { id: studentId }, data: input, select: profileSelect });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      throw new AppError(409, 'That phone number is already in use.');
    }
    throw error;
  }
};

export const getOverview = async (studentId: string) => {
  const now = new Date();
  const submittedStatuses = [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED];

  const [student, mockCount, mockAccuracy, completedContent, totalContent, completedTasks, activeBatches, upcomingSessions, unreadNotifications, mockAttempts, contentCompletions, recentTasks, notices] = await prisma.$transaction([
    prisma.student.findUnique({ where: { id: studentId }, select: { name: true, profileImage: true } }),
    prisma.mockAttempt.count({ where: { studentId, status: { in: submittedStatuses } } }),
    prisma.mockAttempt.aggregate({ where: { studentId, status: { in: submittedStatuses } }, _avg: { accuracy: true } }),
    prisma.studentContentCompletion.count({ where: { studentId } }),
    prisma.content.count({ where: { isActive: true } }),
    prisma.completedTask.count({ where: { studentId, status: TaskStatus.COMPLETED } }),
    prisma.studentBatchAccess.count({ where: { studentId, isActive: true, expiryDate: { gte: now } } }),
    prisma.liveSession.findMany({
      where: {
        startDatetime: { gte: now },
        mentorshipBatch: { studentAccesses: { some: { studentId, isActive: true, expiryDate: { gte: now } } } },
      },
      orderBy: { startDatetime: 'asc' },
      take: 3,
      select: { id: true, title: true, startDatetime: true, endDatetime: true, mentorshipBatch: { select: { name: true } } },
    }),
    prisma.studentNotification.count({ where: { studentId, isRead: false } }),
    prisma.mockAttempt.findMany({
      where: { studentId, status: { in: submittedStatuses } },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      select: { id: true, marksScored: true, totalMarks: true, accuracy: true, submittedAt: true, mockExam: { select: { name: true } } },
    }),
    prisma.studentContentCompletion.findMany({
      where: { studentId },
      orderBy: { completedAt: 'desc' },
      take: 3,
      select: { id: true, completedAt: true, content: { select: { title: true } } },
    }),
    prisma.completedTask.findMany({
      where: { studentId, status: TaskStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      take: 3,
      select: { id: true, completedAt: true, batchTask: { select: { title: true } } },
    }),
    prisma.dashboardNotice.findMany({
      where: { isActive: true, startDatetime: { lte: now }, endDatetime: { gte: now } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 3,
    }),
  ]);

  if (!student) throw new AppError(404, 'Student account not found.');

  const activity = [
    ...mockAttempts.filter((attempt) => attempt.submittedAt).map((attempt) => ({
      id: `mock-${attempt.id}`,
      type: 'MOCK' as const,
      title: `Completed ${attempt.mockExam.name}`,
      detail: `${asNumber(attempt.marksScored)} / ${asNumber(attempt.totalMarks)} marks · ${asNumber(attempt.accuracy).toFixed(0)}% accuracy`,
      occurredAt: attempt.submittedAt!,
    })),
    ...contentCompletions.map((completion) => ({
      id: `content-${completion.id}`,
      type: 'CONTENT' as const,
      title: `Completed ${completion.content.title}`,
      detail: 'Study material completed',
      occurredAt: completion.completedAt,
    })),
    ...recentTasks.filter((task) => task.completedAt).map((task) => ({
      id: `task-${task.id}`,
      type: 'MENTORSHIP' as const,
      title: `Finished ${task.batchTask.title}`,
      detail: 'Mentorship task marked complete',
      occurredAt: task.completedAt!,
    })),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 5);

  return {
    student,
    metrics: {
      mocksAttempted: mockCount,
      averageMockAccuracy: asNumber(mockAccuracy._avg.accuracy),
      contentCompletionPercent: totalContent ? Math.round((completedContent / totalContent) * 100) : 0,
      completedContent,
      totalContent,
      tasksCompleted: completedTasks,
      activeBatches,
      unreadNotifications: unreadNotifications + notices.length,
    },
    upcomingSessions: upcomingSessions.map((session) => ({
      ...session,
      batchName: session.mentorshipBatch.name,
    })),
    recentScores: mockAttempts.map((attempt) => ({
      id: attempt.id,
      examName: attempt.mockExam.name,
      score: asNumber(attempt.marksScored),
      totalMarks: asNumber(attempt.totalMarks),
      accuracy: asNumber(attempt.accuracy),
      submittedAt: attempt.submittedAt,
    })),
    activity,
    dashboardNotices: notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      description: notice.description,
      priority: notice.priority,
      startDatetime: notice.startDatetime,
      endDatetime: notice.endDatetime,
      createdAt: notice.createdAt,
    })),
  };
};

export const getNotifications = async (studentId: string) => {
  const now = new Date();
  const [notifications, notices, unreadCount] = await prisma.$transaction([
    prisma.studentNotification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.dashboardNotice.findMany({
      where: { isActive: true, startDatetime: { lte: now }, endDatetime: { gte: now } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    }),
    prisma.studentNotification.count({ where: { studentId, isRead: false } }),
  ]);

  const systemNotices = notices.map((notice) => ({
    id: `notice-${notice.id}`,
    title: notice.title,
    description: notice.description,
    type: 'SYSTEM' as const,
    actionUrl: null,
    isRead: false,
    readAt: null,
    createdAt: notice.createdAt,
    priority: notice.priority,
    isSystemNotice: true,
  }));

  return {
    notifications: [...notifications.map((notification) => ({ ...notification, priority: null, isSystemNotice: false })), ...systemNotices]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    unreadCount: unreadCount + notices.length,
  };
};

export const markNotificationRead = async (studentId: string, notificationId: string) => {
  const notification = await prisma.studentNotification.findFirst({ where: { id: notificationId, studentId } });
  if (!notification) throw new AppError(404, 'Notification not found.');
  return prisma.studentNotification.update({ where: { id: notificationId }, data: { isRead: true, readAt: new Date() } });
};

export const getAccountSummary = async (studentId: string) => {
  const [parents, feedback, purchases, profile] = await Promise.all([
    listParents(studentId),
    listFeedback(studentId, 3),
    listPurchases(studentId, undefined, 3),
    getProfile(studentId),
  ]);
  return { parents, feedback, purchases, email: { address: profile.email, verified: profile.emailVerified } };
};

export const searchParent = async (studentId: string, query: string) => {
  const trimmed = query.trim();
  const parent = await prisma.parent.findFirst({
    where: { isActive: true, username: trimmed.toLowerCase() },
    select: { id: true, name: true, username: true, email: true, phoneNumber: true, occupation: true, emailVerified: true },
  });
  if (!parent) return null;
  const existing = await prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId: parent.id, studentId } } });
  return { ...parent, alreadyLinked: Boolean(existing) };
};

export const listParents = async (studentId: string) => {
  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: { parent: { select: { id: true, name: true, username: true, email: true, phoneNumber: true, occupation: true, emailVerified: true } } },
  });
  return links.map((link) => ({ parentId: link.parentId, relationship: link.relationship, createdAt: link.createdAt, parent: link.parent }));
};

export const addParent = async (studentId: string, parentId: string, relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN') => {
  const parent = await prisma.parent.findFirst({ where: { id: parentId, isActive: true }, select: { id: true } });
  if (!parent) throw new AppError(404, 'Parent account not found.');
  return prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: { relationship },
    create: { parentId, studentId, relationship },
    include: { parent: { select: { id: true, name: true, username: true, email: true, phoneNumber: true, occupation: true, emailVerified: true } } },
  });
};

export const updateParent = async (studentId: string, parentId: string, relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN') => {
  const link = await prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId } } });
  if (!link) throw new AppError(404, 'Parent link not found.');
  return prisma.parentStudent.update({ where: { parentId_studentId: { parentId, studentId } }, data: { relationship } });
};

export const removeParent = async (studentId: string, parentId: string) => {
  await prisma.parentStudent.deleteMany({ where: { parentId, studentId } });
  return { parentId };
};

export const submitFeedback = async (studentId: string, input: { rating: number; title: string; comment: string }) => {
  return prisma.feedback.create({ data: { studentId, rating: input.rating, title: input.title, comment: input.comment, isPublic: false } });
};

export const listFeedback = async (studentId: string, take = 30) => prisma.feedback.findMany({
  where: { studentId },
  orderBy: { createdAt: 'desc' },
  take: Math.min(Math.max(take, 1), 50),
});

export const listPurchases = async (studentId: string, status?: string, take = 30) => {
  const purchaseStatus = ['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(status ?? '') ? status as 'ACTIVE' | 'EXPIRED' | 'CANCELLED' : undefined;
  return prisma.purchase.findMany({
    where: { studentId, ...(purchaseStatus ? { status: purchaseStatus } : {}) },
    orderBy: { purchaseDate: 'desc' },
    take: Math.min(Math.max(take, 1), 100),
    include: {
      plan: { select: { id: true, name: true, description: true, durationDays: true, isContentIncluded: true } },
      payment: { select: { id: true, amount: true, currency: true, gateway: true, status: true, paidAt: true, gatewayOrderId: true, gatewayPaymentId: true } },
    },
  });
};

export const requestEmailVerification = async (studentId: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { email: true, emailVerified: true } });
  if (!student) throw new AppError(404, 'Student account not found.');
  if (student.emailVerified) return { email: student.email, alreadyVerified: true, devOtp: null };

  const otp = String(randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 12);
  await prisma.emailVerification.create({
    data: {
      email: student.email,
      otpHash,
      purpose: EmailVerificationPurpose.REGISTER,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return { email: student.email, alreadyVerified: false, devOtp: process.env.NODE_ENV === 'production' ? null : otp };
};

export const requestStudentEmailChange = async (studentId: string, email: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { email: true } });
  if (!student) throw new AppError(404, 'Student account not found.');

  const existing = await prisma.student.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== studentId) throw new AppError(409, 'That email address is already used by another student.');

  const otp = String(randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId },
      data: { email, emailVerified: false, emailVerifiedAt: null },
    }),
    prisma.emailVerification.create({
      data: {
        email,
        otpHash,
        purpose: EmailVerificationPurpose.CHANGE_EMAIL,
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      },
    }),
  ]);

  return { email, alreadyVerified: false, devOtp: process.env.NODE_ENV === 'production' ? null : otp };
};

export const verifyStudentEmail = async (studentId: string, otp: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { email: true } });
  if (!student) throw new AppError(404, 'Student account not found.');

  const record = await prisma.emailVerification.findFirst({
    where: { email: student.email, purpose: EmailVerificationPurpose.REGISTER, verifiedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw new AppError(404, 'No active verification code found.');
  if (!(await bcrypt.compare(otp, record.otpHash))) throw new AppError(400, 'Invalid verification code.');

  const now = new Date();
  const [updatedStudent] = await prisma.$transaction([
    prisma.student.update({ where: { id: studentId }, data: { emailVerified: true, emailVerifiedAt: now }, select: profileSelect }),
    prisma.emailVerification.update({ where: { id: record.id }, data: { verifiedAt: now } }),
  ]);
  return updatedStudent;
};

export const verifyStudentEmailChange = async (studentId: string, email: string, otp: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { email: true } });
  if (!student) throw new AppError(404, 'Student account not found.');
  if (student.email !== email) throw new AppError(400, 'This code is not for your current profile email.');

  const record = await prisma.emailVerification.findFirst({
    where: { email, purpose: EmailVerificationPurpose.CHANGE_EMAIL, verifiedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw new AppError(404, 'No active email change code found.');
  if (!(await bcrypt.compare(otp, record.otpHash))) throw new AppError(400, 'Invalid verification code.');

  const now = new Date();
  const [updatedStudent] = await prisma.$transaction([
    prisma.student.update({ where: { id: studentId }, data: { emailVerified: true, emailVerifiedAt: now }, select: profileSelect }),
    prisma.emailVerification.update({ where: { id: record.id }, data: { verifiedAt: now } }),
  ]);
  return updatedStudent;
};
