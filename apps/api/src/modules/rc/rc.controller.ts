import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import * as service from './rc.service.js';

export const dashboard = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ dashboard: await service.dashboard(request.auth!.sub) });
};

export const tests = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ tests: await service.tests(request.auth!.sub) });
};

export const testDetail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ test: await service.testDetail(request.auth!.sub, String(request.params.testId)) });
};

export const attempts = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ attempts: await service.attempts(request.auth!.sub) });
};

export const attemptDetail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ attempt: await service.attemptDetail(request.auth!.sub, String(request.params.attemptId)) });
};
