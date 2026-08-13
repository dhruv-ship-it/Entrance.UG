import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import {
  addParent,
  getAccountSummary,
  getNotifications,
  getOverview,
  getProfile,
  listFeedback,
  listParents,
  listPurchases,
  markNotificationRead,
  removeStudentEmail,
  removeParent,
  requestEmailVerification,
  requestStudentEmailChange,
  searchParent,
  submitFeedback,
  updateParent,
  updateProfile,
  verifyStudentEmail,
  verifyStudentEmailChange,
} from './student.service.js';

export const profile = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ profile: await getProfile(request.auth!.sub) });
};

export const updateMyProfile = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ profile: await updateProfile(request.auth!.sub, request.body) });
};

export const overview = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json(await getOverview(request.auth!.sub));
};

export const notifications = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json(await getNotifications(request.auth!.sub));
};

export const markRead = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ notification: await markNotificationRead(request.auth!.sub, String(request.params.notificationId)) });
};

export const accountSummary = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ account: await getAccountSummary(request.auth!.sub) });
};

export const parentSearch = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ parent: await searchParent(request.auth!.sub, String(request.query.query ?? '')) });
};

export const parents = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ parents: await listParents(request.auth!.sub) });
};

export const createParentLink = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ link: await addParent(request.auth!.sub, request.body.parentId, request.body.relationship) });
};

export const updateParentLink = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ link: await updateParent(request.auth!.sub, String(request.params.parentId), request.body.relationship) });
};

export const deleteParentLink = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ removed: await removeParent(request.auth!.sub, String(request.params.parentId)) });
};

export const feedback = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ feedback: await listFeedback(request.auth!.sub, Number(request.query.take ?? 30)) });
};

export const createFeedback = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ feedback: await submitFeedback(request.auth!.sub, request.body) });
};

export const purchases = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ purchases: await listPurchases(request.auth!.sub, String(request.query.status ?? ''), Number(request.query.take ?? 30)) });
};

export const requestVerification = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ verification: await requestEmailVerification(request.auth!.sub) });
};

export const verifyEmail = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ profile: await verifyStudentEmail(request.auth!.sub, request.body.otp) });
};

export const requestEmailChange = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ verification: await requestStudentEmailChange(request.auth!.sub, request.body.email) });
};

export const verifyEmailChange = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ profile: await verifyStudentEmailChange(request.auth!.sub, request.body.email, request.body.otp) });
};

export const removeEmail = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ profile: await removeStudentEmail(request.auth!.sub) });
};
