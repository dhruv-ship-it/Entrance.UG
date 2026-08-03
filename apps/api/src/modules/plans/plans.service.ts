import { AccessSource, PaymentGateway, PaymentStatus, Prisma, PurchaseStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';

import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/http/app-error.js';

const asNumber = (value: { toNumber(): number } | number | null | undefined) => value == null ? 0 : typeof value === 'number' ? value : value.toNumber();
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const laterDate = (a: Date, b: Date) => a.getTime() >= b.getTime() ? a : b;

const planInclude = {
  mockExamLinks: { include: { examType: { include: { _count: { select: { mockExams: true } } } } } },
  mentorshipProgramLinks: { include: { mentorshipProgram: true } },
} satisfies Prisma.PlanInclude;

export const listPlans = async () => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: planInclude,
  });
  return plans.map(serializePlan);
};

export const createPlanOrder = async (studentId: string, planId: string) => {
  const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) throw new AppError(404, 'Plan not found.');
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new AppError(500, 'Razorpay test keys are not configured on the API server.');

  const amount = asNumber(plan.sellingPrice);
  const payment = await prisma.payment.create({
    data: {
      studentId,
      planId,
      amount: plan.sellingPrice,
      currency: env.RAZORPAY_CURRENCY,
      gateway: PaymentGateway.RAZORPAY,
      status: PaymentStatus.CREATED,
    },
  });

  const order = await createRazorpayOrder({
    amountPaise: Math.round(amount * 100),
    currency: env.RAZORPAY_CURRENCY,
    receipt: `plan_${payment.id}`,
    notes: { paymentId: payment.id, studentId, planId },
  });

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayOrderId: order.id, status: PaymentStatus.PENDING },
  });

  return {
    payment: {
      id: updatedPayment.id,
      amount,
      currency: updatedPayment.currency,
      gatewayOrderId: updatedPayment.gatewayOrderId,
      status: updatedPayment.status,
    },
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    },
  };
};

export const verifyRazorpayPayment = async (studentId: string, input: { paymentId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => {
  const payment = await prisma.payment.findFirst({ where: { id: input.paymentId, studentId }, include: { plan: true } });
  if (!payment) throw new AppError(404, 'Payment not found.');
  if (payment.gatewayOrderId !== input.razorpayOrderId) throw new AppError(400, 'Order mismatch.');
  verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);

  return completeSuccessfulPayment(payment.id, {
    gatewayPaymentId: input.razorpayPaymentId,
    gatewaySignature: input.razorpaySignature,
    gatewayTransactionId: input.razorpayPaymentId,
  });
};

export const handleRazorpayWebhook = async (rawBody: Buffer, signature: string | undefined) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new AppError(500, 'Razorpay webhook secret is not configured.');
  if (!signature) throw new AppError(400, 'Missing Razorpay webhook signature.');
  verifyWebhookSignature(rawBody, signature);

  const event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
  const eventId = event.id ?? `${event.event}_${event.created_at ?? Date.now()}_${event.payload?.payment?.entity?.id ?? event.payload?.order?.entity?.id ?? 'unknown'}`;
  const existing = await prisma.paymentWebhookEvent.findUnique({ where: { gatewayEventId: eventId } });
  if (existing) return { processed: false, duplicate: true };

  const gatewayOrderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
  const gatewayPaymentId = event.payload?.payment?.entity?.id;
  const payment = gatewayOrderId ? await prisma.payment.findFirst({ where: { gatewayOrderId } }) : null;

  let processedPaymentId = payment?.id ?? null;
  if (payment && (event.event === 'payment.captured' || event.event === 'order.paid')) {
    await completeSuccessfulPayment(payment.id, {
      gatewayPaymentId: gatewayPaymentId ?? payment.gatewayPaymentId ?? undefined,
      gatewaySignature: payment.gatewaySignature ?? undefined,
      gatewayTransactionId: gatewayPaymentId ?? payment.gatewayTransactionId ?? undefined,
    });
  } else if (payment && event.event === 'payment.failed') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayPaymentId: gatewayPaymentId ?? payment.gatewayPaymentId,
        gatewayTransactionId: gatewayPaymentId ?? payment.gatewayTransactionId,
        failureReason: event.payload?.payment?.entity?.error_description ?? 'Payment failed',
      },
    });
  }

  await prisma.paymentWebhookEvent.create({
    data: {
      gatewayEventId: eventId,
      eventType: event.event,
      paymentId: processedPaymentId,
      payload: event as unknown as Prisma.InputJsonValue,
    },
  });

  return { processed: true };
};

const completeSuccessfulPayment = async (paymentId: string, gateway: { gatewayPaymentId?: string; gatewaySignature?: string; gatewayTransactionId?: string }) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        plan: {
          include: {
            mockExamLinks: { include: { examType: true } },
            mentorshipProgramLinks: { include: { mentorshipProgram: { include: { batches: { where: { isActive: true }, include: { _count: { select: { studentAccesses: true } } } } } } } },
          },
        },
        purchase: true,
      },
    });
    if (!payment) throw new AppError(404, 'Payment not found.');

    const purchaseDate = new Date();
    const existingPurchase = payment.purchase;
    const baseExpiry = existingPurchase?.expiryDate && existingPurchase.expiryDate > purchaseDate ? existingPurchase.expiryDate : purchaseDate;
    const expiryDate = addDays(baseExpiry, payment.plan.durationDays);

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayPaymentId: gateway.gatewayPaymentId ?? payment.gatewayPaymentId,
        gatewaySignature: gateway.gatewaySignature ?? payment.gatewaySignature,
        gatewayTransactionId: gateway.gatewayTransactionId ?? payment.gatewayTransactionId,
        paidAt: payment.paidAt ?? purchaseDate,
      },
    });

    const purchase = existingPurchase
      ? await tx.purchase.update({ where: { id: existingPurchase.id }, data: { status: PurchaseStatus.ACTIVE, expiryDate, purchasePrice: payment.amount } })
      : await tx.purchase.create({ data: { paymentId: payment.id, studentId: payment.studentId, planId: payment.planId, purchasePrice: payment.amount, purchaseDate, expiryDate, status: PurchaseStatus.ACTIVE } });

    for (const link of payment.plan.mockExamLinks) {
      await upsertMockAccess(tx, payment.studentId, link.examTypeId, purchase.id, expiryDate);
    }

    if (payment.plan.isContentIncluded) {
      await upsertContentAccess(tx, payment.studentId, purchase.id, expiryDate);
    }

    for (const link of payment.plan.mentorshipProgramLinks) {
      const batch = chooseBatch(link.mentorshipProgram.batches);
      if (batch) await upsertBatchAccess(tx, payment.studentId, batch.id, purchase.id, expiryDate);
    }

    return { payment: updatedPayment, purchase };
  });
};

const upsertMockAccess = async (tx: Prisma.TransactionClient, studentId: string, examTypeId: string, purchaseId: string, expiryDate: Date) => {
  const existing = await tx.studentMockAccess.findUnique({ where: { studentId_examTypeId: { studentId, examTypeId } } });
  const nextExpiry = existing ? laterDate(existing.expiryDate, expiryDate) : expiryDate;
  return existing
    ? tx.studentMockAccess.update({ where: { id: existing.id }, data: { purchaseId, accessSource: AccessSource.PURCHASE, expiryDate: nextExpiry } })
    : tx.studentMockAccess.create({ data: { studentId, examTypeId, purchaseId, accessSource: AccessSource.PURCHASE, expiryDate } });
};

const upsertContentAccess = async (tx: Prisma.TransactionClient, studentId: string, purchaseId: string, expiryDate: Date) => {
  const existing = await tx.studentContentAccess.findUnique({ where: { studentId } });
  const nextExpiry = existing ? laterDate(existing.expiryDate, expiryDate) : expiryDate;
  return existing
    ? tx.studentContentAccess.update({ where: { id: existing.id }, data: { purchaseId, accessSource: AccessSource.PURCHASE, expiryDate: nextExpiry } })
    : tx.studentContentAccess.create({ data: { studentId, purchaseId, accessSource: AccessSource.PURCHASE, expiryDate } });
};

const upsertBatchAccess = async (tx: Prisma.TransactionClient, studentId: string, mentorshipBatchId: string, purchaseId: string, expiryDate: Date) => {
  const existing = await tx.studentBatchAccess.findUnique({ where: { studentId_mentorshipBatchId: { studentId, mentorshipBatchId } } });
  const nextExpiry = existing ? laterDate(existing.expiryDate, expiryDate) : expiryDate;
  return existing
    ? tx.studentBatchAccess.update({ where: { id: existing.id }, data: { purchaseId, accessSource: AccessSource.PURCHASE, expiryDate: nextExpiry, isActive: true } })
    : tx.studentBatchAccess.create({ data: { studentId, mentorshipBatchId, purchaseId, accessSource: AccessSource.PURCHASE, expiryDate, isActive: true } });
};

const chooseBatch = (batches: Array<{ id: string; maximumStudents: number; _count: { studentAccesses: number } }>) => {
  const available = batches.filter((batch) => batch._count.studentAccesses < batch.maximumStudents);
  return available.sort((a, b) => a._count.studentAccesses - b._count.studentAccesses || a.maximumStudents - b.maximumStudents)[0] ?? batches.sort((a, b) => a._count.studentAccesses - b._count.studentAccesses)[0] ?? null;
};

const createRazorpayOrder = async (input: { amountPaise: number; currency: string; receipt: string; notes: Record<string, string> }) => {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  const body = await response.json() as { id?: string; amount?: number; currency?: string; error?: { description?: string } };
  if (!response.ok || !body.id || !body.amount || !body.currency) throw new AppError(502, body.error?.description ?? 'Unable to create Razorpay order.');
  return { id: body.id, amount: body.amount, currency: body.currency };
};

const verifyCheckoutSignature = (orderId: string, paymentId: string, signature: string) => {
  if (!env.RAZORPAY_KEY_SECRET) throw new AppError(500, 'Razorpay secret is not configured.');
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  if (!safeEqual(expected, signature)) throw new AppError(400, 'Invalid Razorpay payment signature.');
};

const verifyWebhookSignature = (rawBody: Buffer, signature: string) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new AppError(500, 'Razorpay webhook secret is not configured.');
  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (!safeEqual(expected, signature)) throw new AppError(400, 'Invalid Razorpay webhook signature.');
};

const safeEqual = (expected: string, actual: string) => {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
};

const serializePlan = (plan: Prisma.PlanGetPayload<{ include: typeof planInclude }>) => ({
  id: plan.id,
  name: plan.name,
  description: plan.description,
  originalPrice: asNumber(plan.originalPrice),
  sellingPrice: asNumber(plan.sellingPrice),
  durationDays: plan.durationDays,
  isContentIncluded: plan.isContentIncluded,
  isHighlighted: plan.isHighlighted,
  displayOrder: plan.displayOrder,
  examTypes: plan.mockExamLinks.map(({ examType }) => ({
    id: examType.id,
    name: examType.name,
    description: examType.description,
    mockCount: examType._count.mockExams,
  })),
  mentorshipPrograms: plan.mentorshipProgramLinks.map(({ mentorshipProgram }) => ({
    id: mentorshipProgram.id,
    name: mentorshipProgram.name,
    description: mentorshipProgram.description,
  })),
});

type RazorpayWebhookPayload = {
  id?: string;
  event: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; error_description?: string } };
    order?: { entity?: { id?: string } };
  };
};
