import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/auth/auth.middleware.js';
import { createPlanOrder, handleRazorpayWebhook, listPlans, verifyRazorpayPayment } from './plans.service.js';

export const plans = async (_request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ plans: await listPlans() });
};

export const createOrder = async (request: AuthenticatedRequest, response: Response) => {
  response.status(201).json({ order: await createPlanOrder(request.auth!.sub, request.body.planId) });
};

export const verifyPayment = async (request: AuthenticatedRequest, response: Response) => {
  response.status(200).json({ result: await verifyRazorpayPayment(request.auth!.sub, request.body) });
};

export const razorpayWebhook = async (request: Request, response: Response) => {
  const result = await handleRazorpayWebhook(request.body as Buffer, request.header('x-razorpay-signature'));
  response.status(200).json(result);
};
