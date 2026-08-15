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

export const parentSearchSchema = z.object({
  query: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Enter the parent username.'),
});

export const parentLinkSchema = z.object({
  parentId: z.string().uuid(),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
});

export const parentRelationshipSchema = z.object({
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(255),
  comment: z.string().trim().min(5).max(5000),
});

export const emailOtpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit OTP.'),
});

export const emailChangeRequestSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
});

export const emailChangeVerifySchema = emailChangeRequestSchema.extend({
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit OTP.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
