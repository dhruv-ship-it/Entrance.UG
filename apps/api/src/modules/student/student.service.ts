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

  const [student, mockCount, mockAccuracy, completedContent, totalContent, completedTasks, activeBatches, upcomingSessions, unreadNotifications, mockAttempts, contentCompletions, recentTasks, contentAttempts, rcAttempts, batchAttempts, unreadDashboardNotifications] = await prisma.$transaction([
    prisma.student.findUnique({ where: { id: studentId }, select: { name: true, profileImage: true } }),
    prisma.mockAttempt.count({ where: { studentId, status: { in: submittedStatuses } } }),
    prisma.mockAttempt.aggregate({ where: { studentId, status: { in: submittedStatuses } }, _avg: { accuracy: true } }),
    prisma.studentContentCompletion.count({ where: { studentId } }),
    prisma.content.count({ where: { isActive: true } }),
    prisma.completedTask.count({ where: { studentId, status: TaskStatus.COMPLETED } }),
    prisma.studentBatchAccess.count({ where: { studentId, isActive: true, expiryDate: { gte: now } } }),
    prisma.liveSession.findMany({
      where: {
        startDatetime: { lte: now },
        endDatetime: { gte: now },
        mentorshipBatch: { studentAccesses: { some: { studentId, isActive: true, expiryDate: { gte: now } } } },
      },
      orderBy: { endDatetime: 'asc' },
      take: 3,
      select: { id: true, title: true, startDatetime: true, endDatetime: true, mentorshipBatch: { select: { id: true, name: true } } },
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
      select: {
        id: true,
        completedAt: true,
        content: { select: { title: true, subtopic: { select: { topicId: true, topic: { select: { subjectId: true } } } } } },
      },
    }),
    prisma.completedTask.findMany({
      where: { studentId, status: TaskStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      take: 3,
      select: { id: true, completedAt: true, batchTask: { select: { title: true } } },
    }),
    prisma.contentAttempt.findMany({
      where: { studentId, status: { in: submittedStatuses } },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      select: { id: true, submittedAt: true, marksScored: true, totalMarks: true, accuracy: true, contentTest: { select: { name: true } } },
    }),
    prisma.rcAttempt.findMany({
      where: { studentId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      select: { id: true, submittedAt: true, marksScored: true, totalMarks: true, accuracy: true, rcTest: { select: { title: true } } },
    }),
    prisma.batchAttempt.findMany({
      where: { studentId, status: { in: submittedStatuses } },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      select: { id: true, submittedAt: true, marksScored: true, totalMarks: true, accuracy: true, batchTest: { select: { name: true, mentorshipBatch: { select: { id: true, name: true } } } } },
    }),
    prisma.dashboardNotification.count({
      where: {
        isActive: true,
        startDatetime: { lte: now },
        endDatetime: { gte: now },
        seenBy: { none: { studentId } },
      },
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
      href: `/student/mock-tests/attempts/${attempt.id}/analysis`,
    })),
    ...contentCompletions.map((completion) => ({
      id: `content-${completion.id}`,
      type: 'CONTENT' as const,
      title: `Completed ${completion.content.title}`,
      detail: 'Study material completed',
      occurredAt: completion.completedAt,
      href: `/student/content?subjectId=${completion.content.subtopic.topic.subjectId}&topicId=${completion.content.subtopic.topicId}`,
    })),
    ...contentAttempts.filter((attempt) => attempt.submittedAt).map((attempt) => ({
      id: `content-test-${attempt.id}`,
      type: 'CONTENT' as const,
      title: `Attempted ${attempt.contentTest.name}`,
      detail: `${asNumber(attempt.marksScored)} / ${asNumber(attempt.totalMarks)} marks · ${asNumber(attempt.accuracy).toFixed(0)}% accuracy`,
      occurredAt: attempt.submittedAt!,
      href: `/student/content/attempts/${attempt.id}`,
    })),
    ...rcAttempts.filter((attempt) => attempt.submittedAt).map((attempt) => ({
      id: `rc-${attempt.id}`,
      type: 'RC' as const,
      title: `Attempted ${attempt.rcTest.title}`,
      detail: `${asNumber(attempt.marksScored)} / ${asNumber(attempt.totalMarks)} marks · ${asNumber(attempt.accuracy).toFixed(0)}% accuracy`,
      occurredAt: attempt.submittedAt!,
      href: `/student/rc/attempts/${attempt.id}`,
    })),
    ...batchAttempts.filter((attempt) => attempt.submittedAt).map((attempt) => ({
      id: `batch-test-${attempt.id}`,
      type: 'MENTORSHIP' as const,
      title: `Attempted ${attempt.batchTest.name}`,
      detail: `${attempt.batchTest.mentorshipBatch.name} · ${asNumber(attempt.marksScored)} / ${asNumber(attempt.totalMarks)} marks`,
      occurredAt: attempt.submittedAt!,
      href: `/student/mentorship/batches/${attempt.batchTest.mentorshipBatch.id}/tests/attempts/${attempt.id}/analysis`,
    })),
    ...recentTasks.filter((task) => task.completedAt).map((task) => ({
      id: `task-${task.id}`,
      type: 'MENTORSHIP' as const,
      title: `Finished ${task.batchTask.title}`,
      detail: 'Mentorship task marked complete',
      occurredAt: task.completedAt!,
      href: '/student/mentorship',
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
      unreadNotifications: unreadNotifications + unreadDashboardNotifications,
    },
    upcomingSessions: upcomingSessions.map((session) => ({
      ...session,
      batchName: session.mentorshipBatch.name,
      batchId: session.mentorshipBatch.id,
    })),
    recentScores: mockAttempts.map((attempt) => ({
      id: attempt.id,
      examName: attempt.mockExam.name,
      score: asNumber(attempt.marksScored),
      totalMarks: asNumber(attempt.totalMarks),
      accuracy: asNumber(attempt.accuracy),
      submittedAt: attempt.submittedAt,
      href: `/student/mock-tests/attempts/${attempt.id}/analysis`,
    })),
    activity,
  };
};

export const getNotifications = async (studentId: string) => {
  const now = new Date();
  const [notifications, dashboardNotifications, unreadCount, unreadDashboardCount] = await prisma.$transaction([
    prisma.studentNotification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.dashboardNotification.findMany({
      where: { isActive: true, startDatetime: { lte: now }, endDatetime: { gte: now } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      include: { seenBy: { where: { studentId }, select: { id: true } } },
    }),
    prisma.studentNotification.count({ where: { studentId, isRead: false } }),
    prisma.dashboardNotification.count({
      where: {
        isActive: true,
        startDatetime: { lte: now },
        endDatetime: { gte: now },
        seenBy: { none: { studentId } },
      },
    }),
  ]);

  const systemNotifications = dashboardNotifications.map((notice) => ({
    id: `dashboard-${notice.id}`,
    title: notice.title,
    description: notice.description,
    type: 'SYSTEM' as const,
    actionUrl: null,
    isRead: notice.seenBy.length > 0,
    readAt: null,
    createdAt: notice.createdAt,
    priority: notice.priority,
    isDashboardNotification: true,
  }));

  return {
    notifications: [...notifications.map((notification) => ({ ...notification, priority: null, isDashboardNotification: false })), ...systemNotifications]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    unreadCount: unreadCount + unreadDashboardCount,
  };
};

export const markNotificationRead = async (studentId: string, notificationId: string) => {
  if (notificationId.startsWith('dashboard-')) {
    const dashboardNotificationId = notificationId.replace('dashboard-', '');
    const notification = await prisma.dashboardNotification.findFirst({
      where: { id: dashboardNotificationId, isActive: true },
      select: { id: true },
    });
    if (!notification) throw new AppError(404, 'Notification not found.');
    return prisma.studentDashboardNotificationSeen.upsert({
      where: { studentId_dashboardNotificationId: { studentId, dashboardNotificationId } },
      update: { seenAt: new Date() },
      create: { studentId, dashboardNotificationId },
    });
  }

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
