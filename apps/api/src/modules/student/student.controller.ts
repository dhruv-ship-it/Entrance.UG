import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import { getNotifications, getOverview, getProfile, markNotificationRead, updateProfile } from './student.service.js';

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
