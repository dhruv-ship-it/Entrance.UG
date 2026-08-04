import { z } from 'zod';

export const mockListQuerySchema = z.object({
  examTypeId: z.string().uuid().optional(), mockExamTypeId: z.string().uuid().optional(), search: z.string().trim().max(100).optional(), difficultyId: z.string().uuid().optional(), attempted: z.enum(['true', 'false']).optional(), sort: z.enum(['newest', 'marks', 'duration']).default('newest'),
});

export const mockExamsQuerySchema = z.object({
  examTypeId: z.string().uuid(),
  mockExamTypeId: z.string().uuid(),
});
export const mockAnalyticsQuerySchema = mockExamsQuerySchema;
export const bookmarkSchema = z.object({ bookmarked: z.boolean() });
export const answerSchema = z.object({ selectedAnswers: z.array(z.string().trim().max(100)).max(20), visited: z.boolean().optional(), bookmarked: z.boolean().optional(), markedForReview: z.boolean().optional(), timeTakenSeconds: z.number().int().min(0).max(86_400).optional() });
export const submitSchema = z.object({ sectionTimes: z.array(z.object({ sectionId: z.string().uuid(), timeTakenSeconds: z.number().int().min(0).max(86_400) })).max(30).default([]) });
