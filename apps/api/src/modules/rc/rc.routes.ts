import { Router } from 'express';
import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { attemptDetail, attempts, dashboard, testDetail, tests } from './rc.controller.js';

export const rcRouter = Router();

rcRouter.use(requireStudent);

rcRouter.get('/', dashboard);
rcRouter.get('/tests', tests);
rcRouter.get('/tests/:testId', testDetail);
rcRouter.get('/attempts', attempts);
rcRouter.get('/attempts/:attemptId', attemptDetail);
