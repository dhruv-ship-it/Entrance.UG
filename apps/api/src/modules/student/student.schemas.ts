import { z } from 'zod';

const optionalText = (maxLength: number) => z.string().trim().max(maxLength).nullable().optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phoneNumber: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Use an international phone number.'),
  dateOfBirth: z.coerce.date().refine((value) => value < new Date(), 'Date of birth must be in the past.'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  profileImage: z.union([z.string().url().max(2048), z.null()]).optional(),
  schoolName: optionalText(255),
  className: optionalText(100),
  city: optionalText(100),
  state: optionalText(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
