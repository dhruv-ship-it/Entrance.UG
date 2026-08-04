import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import { AppError } from '../../shared/http/app-error.js';
import * as service from './test-engine.service.js';
import { pillarSchema } from './test-engine.schemas.js';

const parsePillar = (value: unknown) => {
  const parsed = pillarSchema.safeParse(value);
  if (!parsed.success) throw new AppError(400, 'Invalid test pillar.');
  return parsed.data;
};

export const startAttempt = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ attempt: await service.startAttempt(request.auth!.sub, parsePillar(request.params.pillar), String(request.params.testId)) });
};

export const getAttempt = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ engine: await service.getAttempt(request.auth!.sub, parsePillar(request.params.pillar), String(request.params.attemptId)) });
};

export const saveAnswer = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ answer: await service.saveAnswer(request.auth!.sub, parsePillar(request.params.pillar), String(request.params.attemptId), String(request.params.questionId), request.body) });
};

export const submitAttempt = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ result: await service.submitAttempt(request.auth!.sub, parsePillar(request.params.pillar), String(request.params.attemptId), request.body) });
};
