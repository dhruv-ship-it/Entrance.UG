import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import { AUTH_COOKIE_NAME, accessCookieOptions } from '../../shared/auth/jwt.js';
import { getCurrentUser, login, registerParent, registerStudent, requestForgotPassword, resetForgotPassword } from './auth.service.js';

export const signupStudent = async (request: Request, response: Response) => {
  const result = await registerStudent(request.body);
  response.cookie(AUTH_COOKIE_NAME, result.accessToken, accessCookieOptions);
  response.status(201).json({ user: result.user, verification: result.verification });
};

export const signupParent = async (request: Request, response: Response) => {
  const result = await registerParent(request.body);
  response.cookie(AUTH_COOKIE_NAME, result.accessToken, accessCookieOptions);
  response.status(201).json({ user: result.user, verification: result.verification });
};

export const loginAccount = async (request: Request, response: Response) => {
  const result = await login(request.body);
  response.cookie(AUTH_COOKIE_NAME, result.accessToken, accessCookieOptions);
  response.status(200).json({ user: result.user });
};

export const forgotPasswordRequest = async (request: Request, response: Response) => {
  response.status(200).json(await requestForgotPassword(request.body));
};

export const forgotPasswordReset = async (request: Request, response: Response) => {
  response.status(200).json(await resetForgotPassword(request.body));
};

export const logout = (_request: Request, response: Response) => {
  response.clearCookie(AUTH_COOKIE_NAME, { ...accessCookieOptions, maxAge: undefined });
  response.status(204).send();
};

export const currentUser = async (request: AuthenticatedRequest, response: Response) => {
  const user = await getCurrentUser(request.auth!.sub, request.auth!.role);
  response.status(200).json({ user });
};
