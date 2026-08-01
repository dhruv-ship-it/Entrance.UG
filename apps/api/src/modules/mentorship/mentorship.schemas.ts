import { z } from 'zod';
export const doubtSchema = z.object({ title: z.string().trim().min(3).max(255), description: z.string().trim().min(5).max(10_000), visibility: z.enum(['PUBLIC', 'PRIVATE']) });
export const replySchema = z.object({ replyText: z.string().trim().min(1).max(10_000), parentReplyId: z.string().uuid().nullable().optional() });
export const satisfiedSchema = z.object({ isSatisfied: z.boolean() });
