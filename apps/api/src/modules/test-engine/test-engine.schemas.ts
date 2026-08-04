import { z } from 'zod';

export const pillarSchema = z.enum(['mock', 'content', 'batch', 'rc']);

export const answerSchema = z.object({
  selectedAnswers: z.array(z.string().trim().max(200)).max(20),
  visited: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
  markedForReview: z.boolean().optional(),
  timeTakenSeconds: z.number().int().min(0).max(86_400).optional(),
});

export const submitSchema = z.object({
  autoSubmitted: z.boolean().optional().default(false),
  sectionTimes: z.array(z.object({
    sectionId: z.string().uuid(),
    timeTakenSeconds: z.number().int().min(0).max(86_400),
  })).max(50).default([]),
});

export type TestPillar = z.infer<typeof pillarSchema>;
