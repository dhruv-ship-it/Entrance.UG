import { Router } from 'express';

import { requireStudent } from '../../shared/auth/auth.middleware.js';
import { validateBody } from '../../shared/http/validate.js';
import { createOrder, plans, verifyPayment } from './plans.controller.js';
import { createOrderSchema, verifyPaymentSchema } from './plans.schemas.js';

export const plansRouter = Router();

plansRouter.use(requireStudent);
plansRouter.get('/', plans);
plansRouter.post('/orders', validateBody(createOrderSchema), createOrder);
plansRouter.post('/payments/verify', validateBody(verifyPaymentSchema), verifyPayment);
