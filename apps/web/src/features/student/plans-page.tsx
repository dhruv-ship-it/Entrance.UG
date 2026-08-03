import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, GraduationCap, Layers3, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { useAuth } from '../auth/auth-context';

type Plan = {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  sellingPrice: number;
  durationDays: number;
  isContentIncluded: boolean;
  mockExams: { id: string; name: string; examType: string; mockExamType: string; difficulty: string; totalMarks: number; durationMinutes: number; totalSections: number; totalQuestions: number }[];
  mentorshipPrograms: { id: string; name: string; description: string; batchCount: number }[];
};

type OrderResponse = {
  payment: { id: string; amount: number; currency: string; gatewayOrderId: string; status: string };
  razorpay: { keyId: string; orderId: string; amount: number; currency: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export const PlansPage = () => {
  const { user } = useAuth();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const plans = useQuery({ queryKey: ['student-plans'], queryFn: () => api<{ plans: Plan[] }>('/api/v1/plans').then((response) => response.plans) });
  const createOrder = useMutation({ mutationFn: (planId: string) => api<{ order: OrderResponse }>('/api/v1/plans/orders', { method: 'POST', body: JSON.stringify({ planId }) }) });
  const verifyPayment = useMutation({
    mutationFn: (payload: { paymentId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => api('/api/v1/plans/payments/verify', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['student-account'] });
      await client.invalidateQueries({ queryKey: ['student-plans'] });
    },
  });

  const buyPlan = async (plan: Plan) => {
    setError('');
    try {
      await loadRazorpayCheckout();
      const { order } = await createOrder.mutateAsync(plan.id);
      const checkout = new window.Razorpay!({
        key: order.razorpay.keyId,
        amount: order.razorpay.amount,
        currency: order.razorpay.currency,
        name: 'Entrance UG',
        description: plan.name,
        order_id: order.razorpay.orderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#164331' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          await verifyPayment.mutateAsync({
            paymentId: order.payment.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
      });
      checkout.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start checkout.');
    }
  };

  if (plans.isLoading) return <div className="space-y-5"><Skeleton className="h-28 rounded-4xl" />{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-72 rounded-4xl" />)}</div>;
  if (plans.isError || !plans.data) return <EmptyState icon={CreditCard} title="Plans could not load" description="Please refresh and try again." />;

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-4xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">PLANS</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Choose the access that fits your preparation.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">Plans unlock mocks, content and mentorship access through secure Razorpay checkout.</p>
      </section>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {verifyPayment.isSuccess && <p className="rounded-2xl bg-lime/30 px-4 py-3 text-sm font-semibold text-moss-800">Payment verified. Your access has been updated.</p>}

      <section className="grid gap-5 xl:grid-cols-3">
        {plans.data.map((plan, index) => (
          <Card key={plan.id} className={`flex flex-col overflow-hidden p-6 ${index === 2 ? 'border-moss-300 bg-[linear-gradient(160deg,#f6faef,#fff)]' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className={index === 2 ? 'bg-lime/45 text-moss-900' : 'bg-moss-50 text-moss-800'}>{plan.durationDays} days</Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">{plan.name}</h2>
              </div>
              {index === 2 && <span className="grid size-11 place-items-center rounded-2xl bg-moss-800 text-lime"><Sparkles size={20} /></span>}
            </div>
            <p className="mt-3 min-h-20 text-sm leading-6 text-stone-600">{plan.description}</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-tight">₹{plan.sellingPrice.toLocaleString('en-IN')}</span>
              <span className="pb-1 text-sm font-medium text-stone-400 line-through">₹{plan.originalPrice.toLocaleString('en-IN')}</span>
            </div>

            <div className="mt-6 space-y-3">
              {plan.isContentIncluded && <Feature icon={Layers3} text="All paid learning content included" />}
              {plan.mockExams.map((mock) => <Feature key={mock.id} icon={CheckCircle2} text={`${mock.examType} ${mock.mockExamType}: ${mock.name}`} subtext={`${mock.totalQuestions} questions · ${mock.totalMarks} marks · ${mock.durationMinutes} mins`} />)}
              {plan.mentorshipPrograms.map((program) => <Feature key={program.id} icon={GraduationCap} text={program.name} subtext={`${program.batchCount} available batches · automatic least-filled batch assignment`} />)}
              <Feature icon={ShieldCheck} text="Access extension handled automatically on repeat purchase" />
            </div>

            <Button className="mt-auto w-full" size="lg" disabled={createOrder.isPending || verifyPayment.isPending} onClick={() => void buyPlan(plan)}>
              {createOrder.isPending || verifyPayment.isPending ? <><LoaderCircle size={17} className="animate-spin" />Processing...</> : <>Buy plan <CreditCard size={17} /></>}
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
};

const Feature = ({ icon: Icon, text, subtext }: { icon: typeof CheckCircle2; text: string; subtext?: string }) => (
  <div className="flex gap-3 rounded-2xl border border-stone-100 bg-white/75 p-3">
    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-moss-50 text-moss-800"><Icon size={16} /></span>
    <div>
      <p className="text-sm font-semibold text-ink">{text}</p>
      {subtext && <p className="mt-0.5 text-xs leading-5 text-stone-500">{subtext}</p>}
    </div>
  </div>
);

const loadRazorpayCheckout = () => new Promise<void>((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
  document.body.appendChild(script);
});
