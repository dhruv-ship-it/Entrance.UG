import { z } from 'zod';

import { authRoles } from '../../shared/auth/auth.types.js';

const optionalText = (maxLength: number) => z.string().trim().max(maxLength).optional().transform((value) => value || undefined);

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(150),
  username: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Username can contain lowercase letters, numbers and underscores only.'),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  phoneNumber: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Use an international phone number.'),
  password: z.string().min(10).max(128),
  dateOfBirth: z.coerce.date().refine((value) => value < new Date(), 'Date of birth must be in the past.'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  schoolName: optionalText(255),
  className: optionalText(100),
  city: optionalText(100),
  state: optionalText(100),
});

export const loginSchema = z.object({
  role: z.enum(authRoles),
  username: z.string().trim().toLowerCase().min(3).max(50),
  password: z.string().min(1).max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
