import { Router } from 'express';

import { requireParent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import {
  changePassword,
  childBatchAttemptDetail,
  childContentAttemptDetail,
  childContentProgress,
  childMentorshipBatch,
  childMentorshipBatches,
  childMentorshipPrograms,
  childMockAttemptDetail,
  childMockAttemptSwot,
  childMockAttempts,
  childMockBookmarks,
  childMockCategories,
  childMockCategoryAnalytics,
  childMockExams,
  childMockExamTypes,
  childOverview,
  childRcAttemptDetail,
  childRcSummary,
  parentDashboard,
  profile,
  requestEmailChange,
  requestVerification,
  updateProfile,
  verifyEmail,
  verifyEmailChange,
} from './parent.controller.js';
import { changePasswordSchema, emailChangeRequestSchema, emailChangeVerifySchema, emailOtpSchema, updateParentProfileSchema } from './parent.schemas.js';

export const parentRouter = Router();

parentRouter.use(requireParent);
parentRouter.get('/me', profile);
parentRouter.patch('/me', validateBody(updateParentProfileSchema), updateProfile);
parentRouter.patch('/password', validateBody(changePasswordSchema), changePassword);
parentRouter.post('/email-verification/request', requestVerification);
parentRouter.post('/email-verification/verify', validateBody(emailOtpSchema), verifyEmail);
parentRouter.post('/email-verification/change/request', validateBody(emailChangeRequestSchema), requestEmailChange);
parentRouter.post('/email-verification/change/verify', validateBody(emailChangeVerifySchema), verifyEmailChange);
parentRouter.get('/dashboard', parentDashboard);
parentRouter.get('/students/:studentId', childOverview);
parentRouter.get('/students/:studentId/mock/exam-types', childMockExamTypes);
parentRouter.get('/students/:studentId/mock/mock-exam-types', childMockCategories);
parentRouter.get('/students/:studentId/mock/exams', childMockExams);
parentRouter.get('/students/:studentId/mock/analytics', childMockCategoryAnalytics);
parentRouter.get('/students/:studentId/mock/bookmarks', childMockBookmarks);
parentRouter.get('/students/:studentId/mock-attempts', childMockAttempts);
parentRouter.get('/students/:studentId/mock-attempts/:attemptId', childMockAttemptDetail);
parentRouter.get('/students/:studentId/mock-attempts/:attemptId/swot', childMockAttemptSwot);
parentRouter.get('/students/:studentId/content', childContentProgress);
parentRouter.get('/students/:studentId/content-attempts/:attemptId', childContentAttemptDetail);
parentRouter.get('/students/:studentId/rc', childRcSummary);
parentRouter.get('/students/:studentId/rc-attempts/:attemptId', childRcAttemptDetail);
parentRouter.get('/students/:studentId/mentorship/programs', childMentorshipPrograms);
parentRouter.get('/students/:studentId/mentorship/programs/:programId/batches', childMentorshipBatches);
parentRouter.get('/students/:studentId/mentorship/batches/:batchId', childMentorshipBatch);
parentRouter.get('/students/:studentId/mentorship/batch-attempts/:attemptId', childBatchAttemptDetail);
