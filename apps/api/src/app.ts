import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { contentRouter } from './modules/content/content.routes.js';
import { mockRouter } from './modules/mock/mock.routes.js';
import { mentorshipRouter } from './modules/mentorship/mentorship.routes.js';
import { mentorRouter } from './modules/mentor/mentor.routes.js';
import { parentRouter } from './modules/parent/parent.routes.js';
import { razorpayWebhook } from './modules/plans/plans.controller.js';
import { plansRouter } from './modules/plans/plans.routes.js';
import { rcRouter } from './modules/rc/rc.routes.js';
import { studentRouter } from './modules/student/student.routes.js';
import { testEngineRouter } from './modules/test-engine/test-engine.routes.js';
import { errorHandler, notFoundHandler } from './shared/http/error-handler.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.post('/api/v1/plans/webhooks/razorpay', express.raw({ type: 'application/json', limit: '1mb' }), razorpayWebhook);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/students', studentRouter);
app.use('/api/v1/parents', parentRouter);
app.use('/api/v1/mock-tests', mockRouter);
app.use('/api/v1/mentorship', mentorshipRouter);
app.use('/api/v1/mentor', mentorRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/rc', rcRouter);
app.use('/api/v1/plans', plansRouter);
app.use('/api/v1/test-engine', testEngineRouter);
app.use(notFoundHandler);
app.use(errorHandler);
