import { Router } from 'express';

import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import { markRead, notifications, overview, profile, updateMyProfile } from './student.controller.js';
import { updateProfileSchema } from './student.schemas.js';

export const studentRouter = Router();

studentRouter.use(requireStudent);
studentRouter.get('/me', profile);
studentRouter.patch('/me', validateBody(updateProfileSchema), updateMyProfile);
studentRouter.get('/dashboard', overview);
studentRouter.get('/notifications', notifications);
studentRouter.post('/notifications/:notificationId/read', markRead);
