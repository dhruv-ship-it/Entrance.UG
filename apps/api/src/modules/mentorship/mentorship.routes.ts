import { Router } from 'express';
import { z } from 'zod';
import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import {
  batchAttendanceCalendar,
  batchBookmarks,
  batchNotices,
  batchOverview,
  batchSessions,
  batchTasks,
  batchAttemptAnswerBookmark,
  batchTestAttemptAnalysis,
  batchTestDetail,
  batchTests,
  createDoubt,
  createReply,
  doubtStatus,
  doubtReplies,
  doubts,
  listBatches,
  listPrograms,
  replyPinned,
  satisfied,
  sessionJoin,
  submittedBatchAttempts,
  taskCompletion,
} from './mentorship.controller.js';
import { doubtSchema, doubtStatusSchema, replyPinSchema, replySchema, satisfiedSchema } from './mentorship.schemas.js';

export const mentorshipRouter = Router();

mentorshipRouter.use(requireStudent);

mentorshipRouter.get('/programs', listPrograms);
mentorshipRouter.get('/programs/:programId/batches', listBatches);

mentorshipRouter.get('/batches/:batchId', batchOverview);
mentorshipRouter.get('/batches/:batchId/tasks', batchTasks);
mentorshipRouter.get('/batches/:batchId/sessions', batchSessions);
mentorshipRouter.get('/batches/:batchId/attendance-calendar', batchAttendanceCalendar);
mentorshipRouter.get('/batches/:batchId/notices', batchNotices);
mentorshipRouter.get('/batches/:batchId/tests', batchTests);
mentorshipRouter.get('/batches/:batchId/test-bookmarks', batchBookmarks);
mentorshipRouter.get('/batches/:batchId/tests/:testId', batchTestDetail);
mentorshipRouter.get('/batches/:batchId/doubts', doubts);
mentorshipRouter.post('/batches/:batchId/doubts', validateBody(doubtSchema), createDoubt);

mentorshipRouter.patch('/tasks/:taskId/completion', validateBody(z.object({ completed: z.boolean() })), taskCompletion);
mentorshipRouter.post('/sessions/:sessionId/join', sessionJoin);
mentorshipRouter.get('/test-attempts', submittedBatchAttempts);
mentorshipRouter.get('/test-attempts/:attemptId/analysis', batchTestAttemptAnalysis);
mentorshipRouter.patch('/test-attempt-answers/:answerId/bookmark', validateBody(z.object({ bookmarked: z.boolean() })), batchAttemptAnswerBookmark);

mentorshipRouter.get('/doubts/:doubtId/replies', doubtReplies);
mentorshipRouter.post('/doubts/:doubtId/replies', validateBody(replySchema), createReply);
mentorshipRouter.patch('/doubts/:doubtId/satisfied', validateBody(satisfiedSchema), satisfied);
mentorshipRouter.patch('/doubts/:doubtId/status', validateBody(doubtStatusSchema), doubtStatus);
mentorshipRouter.patch('/replies/:replyId/pinned', validateBody(replyPinSchema), replyPinned);
