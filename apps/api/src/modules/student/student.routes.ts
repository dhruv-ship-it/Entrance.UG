import { Router } from 'express';

import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import {
  accountSummary,
  createFeedback,
  createParentLink,
  deleteParentLink,
  feedback,
  markRead,
  notifications,
  overview,
  parentSearch,
  parents,
  profile,
  purchases,
  requestEmailChange,
  requestVerification,
  updateMyProfile,
  updateParentLink,
  verifyEmailChange,
  verifyEmail,
} from './student.controller.js';
import { emailChangeRequestSchema, emailChangeVerifySchema, emailOtpSchema, feedbackSchema, parentLinkSchema, parentRelationshipSchema, updateProfileSchema } from './student.schemas.js';

export const studentRouter = Router();

studentRouter.use(requireStudent);
studentRouter.get('/me', profile);
studentRouter.patch('/me', validateBody(updateProfileSchema), updateMyProfile);
studentRouter.get('/dashboard', overview);
studentRouter.get('/notifications', notifications);
studentRouter.post('/notifications/:notificationId/read', markRead);
studentRouter.get('/account', accountSummary);
studentRouter.get('/parents/search', parentSearch);
studentRouter.get('/parents', parents);
studentRouter.post('/parents', validateBody(parentLinkSchema), createParentLink);
studentRouter.patch('/parents/:parentId', validateBody(parentRelationshipSchema), updateParentLink);
studentRouter.delete('/parents/:parentId', deleteParentLink);
studentRouter.get('/feedback', feedback);
studentRouter.post('/feedback', validateBody(feedbackSchema), createFeedback);
studentRouter.get('/purchases', purchases);
studentRouter.post('/email-verification/request', requestVerification);
studentRouter.post('/email-verification/verify', validateBody(emailOtpSchema), verifyEmail);
studentRouter.post('/email-verification/change/request', validateBody(emailChangeRequestSchema), requestEmailChange);
studentRouter.post('/email-verification/change/verify', validateBody(emailChangeVerifySchema), verifyEmailChange);
