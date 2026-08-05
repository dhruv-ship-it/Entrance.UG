import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import * as service from './mentorship.service.js';

export const listPrograms = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ programs: await service.programs(request.auth!.sub) });
};

export const listBatches = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ batches: await service.batches(request.auth!.sub, String(request.params.programId)) });
};

export const batchOverview = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ batch: await service.overview(request.auth!.sub, String(request.params.batchId)) });
};

export const batchTasks = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ tasks: await service.tasks(request.auth!.sub, String(request.params.batchId)) });
};

export const taskCompletion = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ task: await service.setTaskCompletion(request.auth!.sub, String(request.params.taskId), request.body.completed) });
};

export const batchSessions = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ sessions: await service.sessions(request.auth!.sub, String(request.params.batchId)) });
};

export const batchAttendanceCalendar = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ calendar: await service.attendanceCalendar(request.auth!.sub, String(request.params.batchId), String(request.query.month ?? '')) });
};

export const sessionJoin = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ session: await service.joinSession(request.auth!.sub, String(request.params.sessionId)) });
};

export const batchNotices = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ notices: await service.notices(request.auth!.sub, String(request.params.batchId), Number(request.query.take ?? 20)) });
};

export const batchTests = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ tests: await service.tests(request.auth!.sub, String(request.params.batchId)) });
};

export const batchTestDetail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ test: await service.testDetail(request.auth!.sub, String(request.params.batchId), String(request.params.testId)) });
};

export const batchTestAttemptAnalysis = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ analysis: await service.testAttemptAnalysis(request.auth!.sub, String(request.params.attemptId)) });
};

export const batchAttemptAnswerBookmark = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ answer: await service.setBatchAnswerBookmark(request.auth!.sub, String(request.params.answerId), request.body.bookmarked) });
};

export const doubts = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ doubts: await service.listDoubts(request.auth!.sub, String(request.params.batchId), {
    scope: String(request.query.scope ?? ''),
    status: String(request.query.status ?? ''),
  }) });
};

export const createDoubt = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ doubt: await service.createDoubt(request.auth!.sub, String(request.params.batchId), request.body) });
};

export const doubtReplies = async (request: AuthenticatedRequest, response: Response) => {
  const parentReplyId = request.query.parentReplyId ? String(request.query.parentReplyId) : null;
  response.json({
    replies: await service.replies(
      request.auth!.sub,
      String(request.params.doubtId),
      parentReplyId,
      Number(request.query.take ?? 3),
      Number(request.query.skip ?? 0),
    ),
  });
};

export const createReply = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ reply: await service.addReply(request.auth!.sub, String(request.params.doubtId), request.body) });
};

export const satisfied = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ doubt: await service.setSatisfied(request.auth!.sub, String(request.params.doubtId), request.body.isSatisfied) });
};

export const doubtStatus = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ doubt: await service.setDoubtStatus(request.auth!.sub, String(request.params.doubtId), request.body.status) });
};

export const replyPinned = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ reply: await service.setReplyPinned(request.auth!.sub, String(request.params.replyId), request.body.isPinned) });
};
