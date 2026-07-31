import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import * as service from './content.service.js';

export const learningTree = async (request: AuthenticatedRequest, response: Response) =>
  response.json(await service.getLearningTree(request.auth!.sub));

export const completion = async (request: AuthenticatedRequest, response: Response) =>
  response.json({ completion: await service.setCompletion(request.auth!.sub, String(request.params.contentId), request.body.completed) });
