import { z } from 'zod';

const optionalText = (maxLength: number) => z.string().trim().max(maxLength).nullable().optional();

export const updateParentProfileSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phoneNumber: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Use an international phone number.'),
  occupation: optionalText(255),
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

export type UpdateParentProfileInput = z.infer<typeof updateParentProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
