import { z } from 'zod';

const dateString = z.string().trim().min(1);
const optionalUrl = z.preprocess((value) => value === '' ? null : value, z.string().url().max(2048).nullable().optional());

export const taskSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(5).max(10_000),
  attachmentUrl: optionalUrl,
  startDatetime: dateString,
  endDatetime: dateString,
});

export const sessionSchema = taskSchema.extend({
  meetingLink: z.preprocess((value) => typeof value === 'string' ? value.trim() : value, z.string().url().max(2048)),
});

export const noticeSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(5).max(10_000),
  attachmentUrl: optionalUrl,
});

export const replySchema = z.object({
  replyText: z.string().trim().min(1).max(10_000),
  parentReplyId: z.string().uuid().nullable().optional(),
  attachmentUrl: optionalUrl,
});

export const doubtStatusSchema = z.object({
  status: z.enum(['OPEN', 'ANSWERED', 'CLOSED']),
});

export const doubtVisibilitySchema = z.object({
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
});

export const pinSchema = z.object({ isPinned: z.boolean() });

export const testSchema = z.object({
  name: z.string().trim().min(3).max(255),
  description: z.string().trim().min(5).max(10_000),
  instructions: z.string().trim().min(5).max(20_000),
  difficultyId: z.string().uuid(),
  durationMinutes: z.number().int().positive().max(600),
  canGoBackBetweenSections: z.boolean().default(false),
  isActive: z.boolean().default(true),
  startDatetime: dateString,
  endDatetime: dateString,
});

export const sectionSchema = z.object({
  name: z.string().trim().min(2).max(255),
  sequenceNumber: z.number().int().positive(),
  instructions: z.string().trim().min(1).max(10_000),
  durationMinutes: z.number().int().positive().max(600).nullable().optional(),
  totalMarks: z.number().nonnegative(),
  canGoBackToPreviousQuestion: z.boolean().default(false),
});

export const questionSchema = z.object({
  batchSectionId: z.string().uuid(),
  batchComprehensionId: z.string().uuid().nullable().optional(),
  topicId: z.string().uuid(),
  subtopicId: z.string().uuid(),
  difficultyId: z.string().uuid(),
  sequenceNumber: z.number().int().positive(),
  questionType: z.enum(['MCQ', 'MULTIPLE_CORRECT', 'INTEGER', 'TRUE_FALSE']),
  question: z.string().trim().min(3),
  options: z.unknown().nullable().optional(),
  correctAnswers: z.unknown(),
  positiveMarks: z.number(),
  negativeMarks: z.number().default(0),
  explanation: z.string().trim().min(1),
  imageUrl: optionalUrl,
  isActive: z.boolean().default(true),
});

export const comprehensionSchema = z.object({
  title: z.string().trim().max(255).nullable().optional(),
  passage: z.string().trim().min(10),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type NoticeInput = z.infer<typeof noticeSchema>;
export type TestInput = z.infer<typeof testSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type ComprehensionInput = z.infer<typeof comprehensionSchema>;
