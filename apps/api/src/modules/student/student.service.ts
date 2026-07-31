import { AttemptStatus, TaskStatus } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';
import type { UpdateProfileInput } from './student.schemas.js';

const asNumber = (value: { toNumber(): number } | number | null | undefined) => value == null ? 0 : typeof value === 'number' ? value : value.toNumber();

const profileSelect = {
  id: true,
  name: true,
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

  const [student, mockCount, mockAccuracy, completedContent, totalContent, completedTasks, activeBatches, upcomingSessions, unreadNotifications, mockAttempts, contentCompletions, recentTasks, activeNotices] = await prisma.$transaction([
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
    prisma.dashboardNotice.count({ where: { isActive: true, startDatetime: { lte: now }, endDatetime: { gte: now } } }),
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
      unreadNotifications: unreadNotifications + activeNotices,
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
