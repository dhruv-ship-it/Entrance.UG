import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../http/app-error.js';
import { AUTH_COOKIE_NAME, verifyAccessToken } from './jwt.js';
import type { AuthRole, AuthTokenPayload } from './auth.types.js';

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload;
}

export const requireAuth = (allowedRoles?: AuthRole[]) =>
  (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
    const bearerToken = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    const token = request.cookies?.[AUTH_COOKIE_NAME] ?? bearerToken;

    if (!token) {
      return next(new AppError(401, 'Authentication is required.'));
    }

    try {
      const payload = verifyAccessToken(token);
      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        return next(new AppError(403, 'You do not have access to this resource.'));
      }

      request.auth = payload;
      return next();
    } catch {
      return next(new AppError(401, 'Your session has expired. Please sign in again.'));
    }
  };

export const requireStudent = requireAuth(['STUDENT']);
export const requireParent = requireAuth(['PARENT']);
export const requireMentor = requireAuth(['MENTOR']);
