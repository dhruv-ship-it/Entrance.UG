import { Router } from 'express';

import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import { getAttempt, saveAnswer, startAttempt, submitAttempt } from './test-engine.controller.js';
import { answerSchema, submitSchema } from './test-engine.schemas.js';

export const testEngineRouter = Router();

testEngineRouter.use(requireStudent);

testEngineRouter.post('/:pillar/tests/:testId/attempts', startAttempt);
testEngineRouter.get('/:pillar/attempts/:attemptId', getAttempt);
testEngineRouter.patch('/:pillar/attempts/:attemptId/questions/:questionId', validateBody(answerSchema), saveAnswer);
testEngineRouter.post('/:pillar/attempts/:attemptId/submit', validateBody(submitSchema), submitAttempt);
