import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import * as service from './parent.service.js';

export const profile = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ profile: await service.getParentProfile(request.auth!.sub) });
};

export const updateProfile = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ profile: await service.updateParentProfile(request.auth!.sub, request.body) });
};

export const parentDashboard = async (request: AuthenticatedRequest, response: Response) => {
  response.json(await service.dashboard(request.auth!.sub));
};

export const childOverview = async (request: AuthenticatedRequest, response: Response) => {
  response.json(await service.studentOverview(request.auth!.sub, String(request.params.studentId)));
};

export const childMockAttempts = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ attempts: await service.mockAttempts(request.auth!.sub, String(request.params.studentId)) });
};

export const childMockAttemptDetail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ analysis: await service.mockAttemptDetail(request.auth!.sub, String(request.params.studentId), String(request.params.attemptId)) });
};

export const childContentProgress = async (request: AuthenticatedRequest, response: Response) => {
  response.json(await service.contentProgress(request.auth!.sub, String(request.params.studentId)));
};

export const childContentAttemptDetail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ attempt: await service.contentAttemptDetail(request.auth!.sub, String(request.params.studentId), String(request.params.attemptId)) });
};

export const childRcSummary = async (request: AuthenticatedRequest, response: Response) => {
  response.json(await service.rcSummary(request.auth!.sub, String(request.params.studentId)));
};

export const childRcAttemptDetail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ attempt: await service.rcAttemptDetail(request.auth!.sub, String(request.params.studentId), String(request.params.attemptId)) });
};

export const childMentorshipPrograms = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ programs: await service.mentorshipPrograms(request.auth!.sub, String(request.params.studentId)) });
};

export const childMentorshipBatches = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ batches: await service.mentorshipBatches(request.auth!.sub, String(request.params.studentId), String(request.params.programId)) });
};

export const childMentorshipBatch = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ batch: await service.mentorshipBatch(request.auth!.sub, String(request.params.studentId), String(request.params.batchId)) });
};

export const childBatchAttemptDetail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ analysis: await service.batchAttemptDetail(request.auth!.sub, String(request.params.studentId), String(request.params.attemptId)) });
};

export const changePassword = async (request: AuthenticatedRequest, response: Response) => {
  response.json(await service.changeParentPassword(request.auth!.sub, request.body));
};

export const requestVerification = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ verification: await service.requestParentEmailVerification(request.auth!.sub) });
};

export const verifyEmail = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ profile: await service.verifyParentEmail(request.auth!.sub, request.body.otp) });
};

export const requestEmailChange = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ verification: await service.requestParentEmailChange(request.auth!.sub, request.body.email) });
};

export const verifyEmailChange = async (request: AuthenticatedRequest, response: Response) => {
  response.json({ profile: await service.verifyParentEmailChange(request.auth!.sub, request.body.email, request.body.otp) });
};
