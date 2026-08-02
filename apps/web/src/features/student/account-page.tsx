import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Link2, MailCheck, MessageSquareText, Search, ShieldCheck, Star, Trash2, UserPlus } from 'lucide-react';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { useAuth } from '../auth/auth-context';

type Relationship = 'FATHER' | 'MOTHER' | 'GUARDIAN';
type ParentLink = {
  parentId: string;
  relationship: Relationship;
  createdAt: string;
  parent: { id: string; name: string; username: string; email: string; phoneNumber: string; occupation?: string | null; emailVerified: boolean };
};
type Feedback = { id: string; rating: number; title: string; comment: string; isPublic: boolean; isResolved: boolean; adminReply?: string | null; createdAt: string };
type Purchase = {
  id: string;
  purchasePrice: string | number;
  purchaseDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  plan: { id: string; name: string; description: string; durationDays: number; isContentIncluded: boolean };
  payment: { amount: string | number; currency: string; gateway: string; status: string; paidAt?: string | null };
};
type Account = { parents: ParentLink[]; feedback: Feedback[]; purchases: Purchase[]; email: { address: string; verified: boolean } };
type ParentSearchResult = ParentLink['parent'] & { alreadyLinked: boolean };
type PurchaseFilter = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

const relationshipLabel: Record<Relationship, string> = { FATHER: 'Father', MOTHER: 'Mother', GUARDIAN: 'Guardian' };

export const AccountPage = () => {
  const client = useQueryClient();
  const { refresh } = useAuth();
  const account = useQuery({
    queryKey: ['student-account'],
    queryFn: () => api<{ account: Account }>('/api/v1/students/account').then((response) => response.account),
  });

  const [parentQuery, setParentQuery] = useState('');
  const [parentResult, setParentResult] = useState<ParentSearchResult | null>(null);
  const [relationship, setRelationship] = useState<Relationship>('FATHER');
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>('ALL');
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, title: '', comment: '' });
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [showAllFeedback, setShowAllFeedback] = useState(false);

  const purchases = useQuery({
    queryKey: ['student-purchases', purchaseFilter],
    queryFn: () => api<{ purchases: Purchase[] }>(`/api/v1/students/purchases?take=50${purchaseFilter !== 'ALL' ? `&status=${purchaseFilter}` : ''}`),
    enabled: purchaseFilter !== 'ALL',
  });

  const feedback = useQuery({
    queryKey: ['student-feedback-all'],
    queryFn: () => api<{ feedback: Feedback[] }>('/api/v1/students/feedback?take=50'),
    enabled: showAllFeedback,
  });

  const searchParent = useMutation({
    mutationFn: () => api<{ parent: ParentSearchResult | null }>(`/api/v1/students/parents/search?query=${encodeURIComponent(parentQuery)}`),
    onSuccess: (data) => setParentResult(data.parent),
  });
  const addParent = useMutation({
    mutationFn: () => api('/api/v1/students/parents', { method: 'POST', body: JSON.stringify({ parentId: parentResult?.id, relationship }) }),
    onSuccess: async () => {
      setParentResult(null);
      setParentQuery('');
      await client.invalidateQueries({ queryKey: ['student-account'] });
    },
  });
  const updateParent = useMutation({
    mutationFn: ({ parentId, next }: { parentId: string; next: Relationship }) => api(`/api/v1/students/parents/${parentId}`, { method: 'PATCH', body: JSON.stringify({ relationship: next }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['student-account'] }),
  });
  const removeParent = useMutation({
    mutationFn: (parentId: string) => api(`/api/v1/students/parents/${parentId}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['student-account'] }),
  });
  const submitFeedback = useMutation({
    mutationFn: () => api('/api/v1/students/feedback', { method: 'POST', body: JSON.stringify(feedbackForm) }),
    onSuccess: async () => {
      setFeedbackForm({ rating: 5, title: '', comment: '' });
      await client.invalidateQueries({ queryKey: ['student-account'] });
      await client.invalidateQueries({ queryKey: ['student-feedback-all'] });
    },
  });
  const requestOtp = useMutation({
    mutationFn: () => api<{ verification: { devOtp: string | null; alreadyVerified: boolean } }>('/api/v1/students/email-verification/request', { method: 'POST' }),
    onSuccess: (data) => setDevOtp(data.verification.devOtp),
  });
  const verifyOtp = useMutation({
    mutationFn: () => api('/api/v1/students/email-verification/verify', { method: 'POST', body: JSON.stringify({ otp }) }),
    onSuccess: async () => {
      setOtp('');
      setDevOtp(null);
      await client.invalidateQueries({ queryKey: ['student-account'] });
      await client.invalidateQueries({ queryKey: ['student-profile'] });
      await refresh();
    },
  });

  if (account.isLoading) return <Skeleton className="h-[620px] rounded-4xl" />;
  if (!account.data) return <EmptyState icon={ShieldCheck} title="Account could not load" description="Please refresh the page." />;

  const purchaseRows = purchaseFilter === 'ALL' ? account.data.purchases : purchases.data?.purchases ?? [];
  const feedbackRows = showAllFeedback ? feedback.data?.feedback ?? [] : account.data.feedback;

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-4xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">ACCOUNT HUB</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Family, purchases and feedback</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">Manage linked parents, verify your email, review plan purchases and send private feedback to the team.</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-lime/35 text-moss-800"><UserPlus size={20} /></span>
            <div>
              <h2 className="font-bold">Parents</h2>
              <p className="text-sm text-stone-500">Search an existing parent by username.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <Input value={parentQuery} onChange={(event) => setParentQuery(event.target.value.toLowerCase())} placeholder="parent_username" />
            <Button disabled={parentQuery.trim().length < 3 || searchParent.isPending} onClick={() => searchParent.mutate()}><Search size={16} />Search</Button>
          </div>

          {searchParent.isSuccess && !parentResult && <p className="mt-3 rounded-2xl bg-amber/15 px-4 py-3 text-sm font-medium text-[#8d620f]">No active parent account found for that value.</p>}

          {parentResult && (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{parentResult.name}</p>
                  <p className="text-sm text-stone-500">@{parentResult.username} · {parentResult.emailVerified ? parentResult.email : 'Email not verified'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <RelationshipSelect value={relationship} onChange={setRelationship} />
                  <Button disabled={parentResult.alreadyLinked || addParent.isPending} onClick={() => window.confirm('Add this parent to your account?') && addParent.mutate()}>
                    <Link2 size={16} />{parentResult.alreadyLinked ? 'Already linked' : 'Add parent'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {account.data.parents.length ? account.data.parents.map((link) => (
              <div key={link.parentId} className="rounded-2xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{link.parent.name}</p>
                      <Badge className="bg-moss-50 text-moss-800">{relationshipLabel[link.relationship]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">@{link.parent.username} · {link.parent.emailVerified ? link.parent.email : 'Email not verified'}</p>
                  </div>
                  <div className="flex gap-2">
                    <RelationshipSelect value={link.relationship} onChange={(next) => updateParent.mutate({ parentId: link.parentId, next })} />
                    <Button variant="danger" size="sm" onClick={() => window.confirm('Remove this parent link?') && removeParent.mutate(link.parentId)}><Trash2 size={15} /></Button>
                  </div>
                </div>
              </div>
            )) : <EmptyState compact icon={UserPlus} title="No parents linked" description="Linked parent accounts will appear here." />}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-sky/15 text-[#28718d]"><MailCheck size={20} /></span>
            <div>
              <h2 className="font-bold">Email verification</h2>
              <p className="text-sm text-stone-500">{account.data.email.address}</p>
            </div>
          </div>
          <Badge className={account.data.email.verified ? 'mt-5 bg-emerald-100 text-emerald-800' : 'mt-5 bg-amber/20 text-[#93620c]'}>{account.data.email.verified ? 'Verified' : 'Not verified'}</Badge>
          {!account.data.email.verified && (
            <div className="mt-5 space-y-3">
              <Button onClick={() => requestOtp.mutate()} disabled={requestOtp.isPending}>Request OTP</Button>
              {devOtp && <p className="rounded-xl bg-moss-50 px-3 py-2 text-sm font-semibold text-moss-800">Dev OTP: {devOtp}</p>}
              <div className="flex gap-2">
                <Input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit OTP" />
                <Button disabled={otp.length !== 6 || verifyOtp.isPending} onClick={() => verifyOtp.mutate()}>Verify</Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-coral/15 text-[#b54c3a]"><MessageSquareText size={20} /></span>
              <div>
                <h2 className="font-bold">Feedback</h2>
                <p className="text-sm text-stone-500">Submitted as private by default.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAllFeedback((value) => !value)}>{showAllFeedback ? 'Recent' : 'Show all'}</Button>
          </div>

          <form className="mt-5 space-y-3" onSubmit={(event: FormEvent) => { event.preventDefault(); submitFeedback.mutate(); }}>
            <select value={feedbackForm.rating} onChange={(event) => setFeedbackForm((form) => ({ ...form, rating: Number(event.target.value) }))} className="focus-ring w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
            </select>
            <Input value={feedbackForm.title} onChange={(event) => setFeedbackForm((form) => ({ ...form, title: event.target.value }))} placeholder="Feedback title" />
            <textarea value={feedbackForm.comment} onChange={(event) => setFeedbackForm((form) => ({ ...form, comment: event.target.value }))} className="focus-ring min-h-28 w-full rounded-xl border border-stone-200 p-3 text-sm" placeholder="Tell us what should improve..." />
            <Button disabled={submitFeedback.isPending || feedbackForm.title.trim().length < 3 || feedbackForm.comment.trim().length < 5} type="submit">Submit private feedback</Button>
          </form>

          <div className="mt-5 space-y-3">
            {feedbackRows.length ? feedbackRows.map((item) => (
              <div key={item.id} className="rounded-2xl border border-stone-200 p-4">
                <div className="flex justify-between gap-3">
                  <p className="font-bold">{item.title}</p>
                  <Badge className="bg-amber/15 text-[#9a6810]">{item.rating} <Star size={12} /></Badge>
                </div>
                <p className="mt-2 text-sm text-stone-600">{item.comment}</p>
                <p className="mt-2 text-xs text-stone-400">{formatDateTime(item.createdAt)} · {item.isResolved ? 'Resolved' : 'Pending'}</p>
                {item.adminReply && <p className="mt-2 rounded-xl bg-moss-50 p-3 text-sm text-moss-800">{item.adminReply}</p>}
              </div>
            )) : <EmptyState compact icon={MessageSquareText} title="No feedback yet" description="Send feedback whenever something feels off or useful." />}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-moss-100 text-moss-800"><CreditCard size={20} /></span>
              <div>
                <h2 className="font-bold">Purchases</h2>
                <p className="text-sm text-stone-500">Recent plans and access purchases.</p>
              </div>
            </div>
            <select value={purchaseFilter} onChange={(event) => setPurchaseFilter(event.target.value as PurchaseFilter)} className="focus-ring rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="mt-5 space-y-3">
            {purchaseRows.length ? purchaseRows.map((purchase) => (
              <div key={purchase.id} className="rounded-2xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{purchase.plan.name}</p>
                    <p className="mt-1 text-xs text-stone-500">Plan ID: {purchase.plan.id}</p>
                  </div>
                  <Badge className={purchase.status === 'ACTIVE' ? 'bg-lime/40 text-moss-900' : 'bg-stone-100 text-stone-600'}>{purchase.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-stone-600">{purchase.plan.description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-stone-500">
                  <span>Paid {purchase.payment.currency} {Number(purchase.purchasePrice)}</span>
                  <span>{purchase.payment.gateway}</span>
                  <span>Purchased {formatDateTime(purchase.purchaseDate)}</span>
                  <span>Expires {new Date(purchase.expiryDate).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            )) : <EmptyState compact icon={CreditCard} title="No purchases found" description="Your plan purchases will appear here." />}
          </div>
        </Card>
      </section>
    </div>
  );
};

const RelationshipSelect = ({ value, onChange }: { value: Relationship; onChange: (value: Relationship) => void }) => (
  <select value={value} onChange={(event) => onChange(event.target.value as Relationship)} className="focus-ring rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
    <option value="FATHER">Father</option>
    <option value="MOTHER">Mother</option>
    <option value="GUARDIAN">Guardian</option>
  </select>
);
