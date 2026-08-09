import { Router } from 'express';

import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import {
  answer,
  attemptAnalysis,
  attemptSwotAnalysis,
  begin,
  bookmarkAnswer,
  bookmarks,
  catalog,
  categoryAnalytics,
  engine,
  examDetail,
  exams,
  examTypes,
  mockExamTypes,
  submit,
  submittedAttempts,
} from './mock.controller.js';
import { answerSchema, submitSchema } from './mock.schemas.js';

export const mockRouter = Router();

mockRouter.use(requireStudent);

mockRouter.get('/exam-types', examTypes);
mockRouter.get('/mock-exam-types', mockExamTypes);
mockRouter.get('/exams', exams);
mockRouter.get('/analytics', categoryAnalytics);
mockRouter.get('/bookmarks', bookmarks);
mockRouter.get('/attempts', submittedAttempts);
mockRouter.get('/exams/:examId', examDetail);
mockRouter.get('/attempts/:attemptId/analysis', attemptAnalysis);
mockRouter.get('/attempts/:attemptId/swot', attemptSwotAnalysis);
mockRouter.patch('/attempt-answers/:answerId/bookmark', bookmarkAnswer);
mockRouter.get('/', catalog);

// Legacy mock-only engine routes kept for compatibility. New UI uses /api/v1/test-engine.
mockRouter.post('/:mockId/attempts', begin);
mockRouter.get('/attempts/:attemptId', engine);
mockRouter.patch('/attempts/:attemptId/questions/:questionId', validateBody(answerSchema), answer);
mockRouter.post('/attempts/:attemptId/submit', validateBody(submitSchema), submit);
