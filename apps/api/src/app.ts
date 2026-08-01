import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { contentRouter } from './modules/content/content.routes.js';
import { mockRouter } from './modules/mock/mock.routes.js';
import { mentorshipRouter } from './modules/mentorship/mentorship.routes.js';
import { studentRouter } from './modules/student/student.routes.js';
import { errorHandler, notFoundHandler } from './shared/http/error-handler.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/students', studentRouter);
app.use('/api/v1/mock-tests', mockRouter);
app.use('/api/v1/mentorship', mentorshipRouter);
app.use('/api/v1/content', contentRouter);
app.use(notFoundHandler);
app.use(errorHandler);
