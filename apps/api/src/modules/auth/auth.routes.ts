import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireAuth } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import { currentUser, loginAccount, logout, signupStudent } from './auth.controller.js';
import { loginSchema, signupSchema } from './auth.schemas.js';

export const authRouter = Router();

const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait before trying again.' },
});

authRouter.post('/student/signup', authenticationLimiter, validateBody(signupSchema), signupStudent);
authRouter.post('/login', authenticationLimiter, validateBody(loginSchema), loginAccount);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth(), currentUser);
