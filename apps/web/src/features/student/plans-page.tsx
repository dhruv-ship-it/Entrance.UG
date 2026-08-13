import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, GraduationCap, Layers3, LoaderCircle } from 'lucide-react';
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
  isHighlighted: boolean;
  examTypes: { id: string; name: string; description: string; mockCount: number }[];
  mentorshipPrograms: { id: string; name: string; description: string }[];
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
        prefill: { name: user?.name, email: user?.email ?? undefined },
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
        {plans.data.map((plan) => (
          <Card key={plan.id} className={`relative flex flex-col overflow-hidden p-6 transition duration-300 ${plan.isHighlighted ? 'border-lime/50 bg-[linear-gradient(180deg,#fcfff8_0%,#f7fceb_100%)] shadow-xl shadow-moss-900/8 ring-1 ring-lime/25' : ''}`}>
            {plan.isHighlighted && <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#d9f99d,#84a83b,#d9f99d)]" />}
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className={plan.isHighlighted ? 'bg-lime/35 text-moss-900' : 'bg-moss-50 text-moss-800'}>{plan.durationDays} days</Badge>
                <h2 className={`mt-4 text-2xl font-semibold tracking-tight ${plan.isHighlighted ? 'text-moss-950' : ''}`}>{plan.name}</h2>
              </div>
              {plan.isHighlighted && <div className="shrink-0 rounded-full border border-lime/50 bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-moss-700 shadow-sm">Recommended</div>}
            </div>
            <p className={`mt-3 min-h-20 text-sm leading-6 ${plan.isHighlighted ? 'text-moss-900/70' : 'text-stone-600'}`}>{plan.description}</p>
            <div className="mt-5 flex items-end gap-2">
              <span className={`text-4xl font-semibold tracking-tight ${plan.isHighlighted ? 'text-moss-900' : ''}`}>₹{plan.sellingPrice.toLocaleString('en-IN')}</span>
              <span className={`pb-1 text-sm font-medium line-through ${plan.isHighlighted ? 'text-moss-900/35' : 'text-stone-400'}`}>₹{plan.originalPrice.toLocaleString('en-IN')}</span>
            </div>

            <div className="mt-6 space-y-3">
              {plan.isContentIncluded && <Feature icon={Layers3} text="All paid learning content included" highlighted={plan.isHighlighted} />}
              {plan.examTypes.map((examType) => <Feature key={examType.id} icon={CheckCircle2} text={`${examType.name} mock test access`} highlighted={plan.isHighlighted} />)}
              {plan.mentorshipPrograms.map((program) => <Feature key={program.id} icon={GraduationCap} text={program.name} highlighted={plan.isHighlighted} />)}
            </div>

            <Button className={`mt-auto w-full ${plan.isHighlighted ? 'bg-moss-800 text-white hover:bg-moss-700' : ''}`} size="lg" disabled={createOrder.isPending || verifyPayment.isPending} onClick={() => void buyPlan(plan)}>
              {createOrder.isPending || verifyPayment.isPending ? <><LoaderCircle size={17} className="animate-spin" />Processing...</> : <>Buy plan <CreditCard size={17} /></>}
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
};

const Feature = ({ icon: Icon, text, subtext, highlighted = false }: { icon: typeof CheckCircle2; text: string; subtext?: string; highlighted?: boolean }) => (
  <div className={`flex gap-3 rounded-2xl border p-3 ${highlighted ? 'border-moss-100 bg-white/70' : 'border-stone-100 bg-white/75'}`}>
    <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${highlighted ? 'bg-moss-800 text-lime' : 'bg-moss-50 text-moss-800'}`}><Icon size={16} /></span>
    <div>
      <p className={`text-sm font-semibold ${highlighted ? 'text-moss-950' : 'text-ink'}`}>{text}</p>
      {subtext && <p className={`mt-0.5 text-xs leading-5 ${highlighted ? 'text-moss-900/60' : 'text-stone-500'}`}>{subtext}</p>}
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
