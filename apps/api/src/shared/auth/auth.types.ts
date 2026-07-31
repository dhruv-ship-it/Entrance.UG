import type { AdminRole } from '@prisma/client';

export const authRoles = ['STUDENT', 'PARENT', 'MENTOR', 'ADMIN'] as const;
export type AuthRole = (typeof authRoles)[number];

export interface AuthTokenPayload {
  sub: string;
  role: AuthRole;
  adminRole?: AdminRole;
}

