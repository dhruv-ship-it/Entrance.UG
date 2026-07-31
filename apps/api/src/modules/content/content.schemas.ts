import { z } from 'zod';

export const completionSchema = z.object({
  completed: z.boolean(),
});
