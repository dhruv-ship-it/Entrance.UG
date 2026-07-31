import { Router } from 'express';
import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import { attempts, completion, learningTree } from './content.controller.js';
import { completionSchema } from './content.schemas.js';

export const contentRouter = Router();
contentRouter.use(requireStudent);
contentRouter.get('/', learningTree);
contentRouter.get('/attempts', attempts);
contentRouter.patch('/contents/:contentId/completion', validateBody(completionSchema), completion);
