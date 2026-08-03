import { z } from 'zod';

export const createOrderSchema = z.object({
  planId: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  razorpayOrderId: z.string().min(1).max(255),
  razorpayPaymentId: z.string().min(1).max(255),
  razorpaySignature: z.string().min(1).max(1024),
});
