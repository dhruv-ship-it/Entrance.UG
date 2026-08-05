import { z } from 'zod';

export const completionSchema = z.object({
  completed: z.boolean(),
});

export const contentNoteSchema = z.object({
  note: z.string().trim().min(1, 'A note cannot be empty.').max(10_000, 'Notes must be 10,000 characters or fewer.'),
});

export const contentAttemptBookmarkSchema = z.object({
  bookmarked: z.boolean(),
});
