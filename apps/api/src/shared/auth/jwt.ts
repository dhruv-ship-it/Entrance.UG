import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import type { AuthTokenPayload } from './auth.types.js';

export const AUTH_COOKIE_NAME = 'entrance_ug_access_token';
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

export const signAccessToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'entrance-ug-api',
    audience: 'entrance-ug-web',
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: 'entrance-ug-api',
    audience: 'entrance-ug-web',
  }) as AuthTokenPayload;

export const accessCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  path: '/',
};

