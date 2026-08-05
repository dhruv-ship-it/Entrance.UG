import { Router } from 'express';
import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import { attemptDetail, attempts, bookmarkAttemptAnswer, bookmarks, completion, learningTree, saveContentNote } from './content.controller.js';
import { completionSchema, contentAttemptBookmarkSchema, contentNoteSchema } from './content.schemas.js';

export const contentRouter = Router();
contentRouter.use(requireStudent);
contentRouter.get('/', learningTree);
contentRouter.get('/attempts', attempts);
contentRouter.get('/bookmarks', bookmarks);
contentRouter.get('/attempts/:attemptId', attemptDetail);
contentRouter.patch('/attempt-answers/:answerId/bookmark', validateBody(contentAttemptBookmarkSchema), bookmarkAttemptAnswer);
contentRouter.patch('/contents/:contentId/completion', validateBody(completionSchema), completion);
contentRouter.put('/contents/:contentId/note', validateBody(contentNoteSchema), saveContentNote);
