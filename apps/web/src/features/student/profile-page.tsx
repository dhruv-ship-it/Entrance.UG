import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle2, CircleUserRound, LoaderCircle, Mail, Save, ShieldCheck, Trash2 } from 'lucide-react';

import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { useAuth } from '../auth/auth-context';

type Profile = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  profileImage: string | null;
  schoolName: string | null;
  className: string | null;
  city: string | null;
  state: string | null;
  emailVerified: boolean;
  createdAt: string;
};

const fields = ['name', 'phoneNumber', 'dateOfBirth', 'gender', 'profileImage', 'schoolName', 'className', 'city', 'state'] as const;

export const ProfilePage = () => {
  const { refresh } = useAuth();
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ['student-profile'], queryFn: () => api<{ profile: Profile }>('/api/v1/students/me').then((response) => response.profile) });
  const [form, setForm] = useState<Record<(typeof fields)[number], string>>({ name: '', phoneNumber: '', dateOfBirth: '', gender: '', profileImage: '', schoolName: '', className: '', city: '', state: '' });
  const [emailForm, setEmailForm] = useState({ email: '', otp: '' });
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: unknown) => api<{ profile: Profile }>('/api/v1/students/me', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['student-profile'] });
      await client.invalidateQueries({ queryKey: ['student-overview'] });
      await refresh();
    },
  });
  const requestCurrentOtp = useMutation({
    mutationFn: () => api<{ verification: { devOtp: string | null; alreadyVerified: boolean } }>('/api/v1/students/email-verification/request', { method: 'POST' }),
    onSuccess: (data) => {
      setDevOtp(data.verification.devOtp);
      setEmailMessage(data.verification.alreadyVerified ? 'This email is already verified.' : 'OTP generated for your current email.');
    },
  });
  const verifyCurrentOtp = useMutation({
    mutationFn: () => api('/api/v1/students/email-verification/verify', { method: 'POST', body: JSON.stringify({ otp: emailForm.otp }) }),
    onSuccess: async () => afterEmailSuccess('Email verified successfully.'),
  });
  const requestChangeOtp = useMutation({
    mutationFn: () => api<{ verification: { devOtp: string | null; email: string } }>('/api/v1/students/email-verification/change/request', { method: 'POST', body: JSON.stringify({ email: emailForm.email }) }),
    onSuccess: (data) => {
      setDevOtp(data.verification.devOtp);
      setEmailMessage('OTP generated. Your current email will remain unchanged until this new email is verified.');
    },
  });
  const verifyChangeOtp = useMutation({
    mutationFn: () => api('/api/v1/students/email-verification/change/verify', { method: 'POST', body: JSON.stringify({ email: emailForm.email, otp: emailForm.otp }) }),
    onSuccess: async () => afterEmailSuccess('New email verified successfully.'),
  });
  const removeEmail = useMutation({
    mutationFn: () => api('/api/v1/students/email', { method: 'DELETE' }),
    onSuccess: async () => {
      setEmailForm({ email: '', otp: '' });
      setDevOtp(null);
      setEmailMessage('Email removed from your account.');
      await client.invalidateQueries({ queryKey: ['student-profile'] });
      await client.invalidateQueries({ queryKey: ['student-account'] });
      await refresh();
    },
  });

  const afterEmailSuccess = async (message: string) => {
    setEmailForm((current) => ({ ...current, otp: '' }));
    setDevOtp(null);
    setEmailMessage(message);
    await client.invalidateQueries({ queryKey: ['student-profile'] });
    await client.invalidateQueries({ queryKey: ['student-account'] });
    await refresh();
  };

  useEffect(() => {
    if (profile.data) {
      setForm({
        name: profile.data.name,
        phoneNumber: profile.data.phoneNumber,
        dateOfBirth: profile.data.dateOfBirth.slice(0, 10),
        gender: profile.data.gender,
        profileImage: profile.data.profileImage ?? '',
        schoolName: profile.data.schoolName ?? '',
        className: profile.data.className ?? '',
        city: profile.data.city ?? '',
        state: profile.data.state ?? '',
      });
      setEmailForm((current) => ({ ...current, email: profile.data.email ?? '' }));
    }
  }, [profile.data]);

  if (profile.isLoading) return <ProfileSkeleton />;
  if (profile.isError || !profile.data) return <Card className="p-8 text-center text-stone-500">We could not load your profile. Please refresh the page.</Card>;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ ...form, profileImage: form.profileImage || null, schoolName: form.schoolName || null, className: form.className || null, city: form.city || null, state: form.state || null });
  };
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const currentEmail = profile.data.email ?? '';
  const hasEmail = Boolean(currentEmail);
  const normalizedEmail = emailForm.email.trim().toLowerCase();
  const emailChanged = normalizedEmail !== currentEmail.toLowerCase();
  const hasTypedEmail = normalizedEmail.includes('@');
  const canVerify = emailForm.otp.length === 6;
  const canRequestOtp = hasTypedEmail && (emailChanged || (!profile.data.emailVerified && hasEmail));
  const emailActionLabel = emailChanged ? (hasEmail ? 'Send OTP for new email' : 'Add email & send OTP') : profile.data.emailVerified ? 'Already verified' : 'Send OTP';

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile & preferences</h1>
        <p className="mt-2 text-sm text-stone-500">Keep your identity, contact and study details current.</p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <Card className="h-fit overflow-hidden">
          <div className="bg-moss-800 px-6 py-7 text-white">
            <p className="text-sm font-semibold">Your student identity</p>
            <p className="mt-1 text-xs leading-5 text-moss-100/70">Username is your login handle. Profile image uploads will be connected when storage is configured.</p>
          </div>
          <div className="p-6">
            <div className="relative mx-auto w-fit">
              <Avatar name={form.name || profile.data.name} src={form.profileImage || null} className="size-28 rounded-3xl text-2xl" />
              <span className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-xl bg-lime text-moss-900 shadow-card"><Camera size={17} /></span>
            </div>
            <p className="mt-5 text-center font-semibold">{form.name || profile.data.name}</p>
            <p className="mt-1 text-center text-sm text-stone-500">@{profile.data.username}</p>
            <div className="mt-6 rounded-2xl bg-moss-50 p-4">
              <div className="flex gap-3">
                <CheckCircle2 size={18} className={profile.data.emailVerified ? 'text-moss-700' : 'text-stone-400'} />
                <div>
                  <p className="text-sm font-semibold">{hasEmail ? `Email ${profile.data.emailVerified ? 'verified' : 'not verified'}` : 'No email added'}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {hasEmail
                      ? profile.data.emailVerified ? 'Verified email is active for account communication.' : 'Verify this email before production communication is enabled.'
                      : 'You can add and verify an email anytime from the panel on this page.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-moss-100 text-moss-800"><CircleUserRound size={21} /></div>
              <div>
                <h2 className="font-semibold">Personal details</h2>
                <p className="text-sm text-stone-500">These details help keep your profile useful and complete.</p>
              </div>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Label text="Full name"><Input value={form.name} onChange={update('name')} required /></Label>
              <Label text="Username"><Input value={profile.data.username} disabled className="bg-stone-50 text-stone-500" /></Label>
              <Label text="Phone number"><Input value={form.phoneNumber} onChange={update('phoneNumber')} required /></Label>
              <Label text="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} required /></Label>
              <Label text="Gender">
                <select value={form.gender} onChange={update('gender')} required className="focus-ring h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </Label>
              <Label text="Profile image URL"><Input type="url" value={form.profileImage} onChange={update('profileImage')} placeholder="https://..." /></Label>
            </div>
            <div className="my-7 border-t border-stone-100" />
            <h3 className="font-semibold">Study details</h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Label text="School name"><Input value={form.schoolName} onChange={update('schoolName')} placeholder="Optional" /></Label>
              <Label text="Class"><Input value={form.className} onChange={update('className')} placeholder="Optional" /></Label>
              <Label text="City"><Input value={form.city} onChange={update('city')} placeholder="Optional" /></Label>
              <Label text="State"><Input value={form.state} onChange={update('state')} placeholder="Optional" /></Label>
            </div>
            {mutation.isError && <p className="mt-5 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{mutation.error instanceof Error ? mutation.error.message : 'Unable to save your profile.'}</p>}
            <div className="mt-8 flex justify-end"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle size={16} className="animate-spin" />Saving...</> : <><Save size={16} />Save changes</>}</Button></div>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-sky/15 text-[#28718d]"><Mail size={21} /></div>
                <div>
                  <h2 className="font-semibold">Email verification</h2>
                  <p className="text-sm text-stone-500">Add, change or verify your email using a one-time code. A new email replaces the old one only after OTP verification.</p>
                </div>
              </div>
              <Badge className={profile.data.emailVerified ? 'bg-emerald-100 text-emerald-800' : hasEmail ? 'bg-amber/20 text-[#93620c]' : 'bg-stone-100 text-stone-600'}><ShieldCheck size={13} />{profile.data.emailVerified ? 'Verified' : hasEmail ? 'Not verified' : 'No email'}</Badge>
            </div>
            {hasEmail && (
              <p className="mt-5 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                Current account email: <span className="font-semibold text-stone-900">{currentEmail}</span>
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input type="email" value={emailForm.email} onChange={(event) => setEmailForm((current) => ({ ...current, email: event.target.value.toLowerCase(), otp: '' }))} placeholder="you@example.com" />
              <Button type="button" variant={emailChanged ? 'primary' : 'outline'} disabled={requestCurrentOtp.isPending || requestChangeOtp.isPending || !canRequestOtp} onClick={() => emailChanged ? requestChangeOtp.mutate() : requestCurrentOtp.mutate()}>
                {requestCurrentOtp.isPending || requestChangeOtp.isPending ? 'Sending...' : emailActionLabel}
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={emailForm.otp} onChange={(event) => setEmailForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="6 digit OTP" />
              <Button type="button" disabled={!canVerify || verifyCurrentOtp.isPending || verifyChangeOtp.isPending || (!emailChanged && !hasEmail)} onClick={() => emailChanged ? verifyChangeOtp.mutate() : verifyCurrentOtp.mutate()}>Verify email</Button>
            </div>
            {hasEmail && (
              <Button className="mt-3" type="button" variant="ghost" disabled={removeEmail.isPending} onClick={() => removeEmail.mutate()}>
                <Trash2 size={15} />{removeEmail.isPending ? 'Removing...' : 'Remove email'}
              </Button>
            )}
            {devOtp && <p className="mt-3 rounded-xl bg-moss-50 px-3 py-2 text-sm font-semibold text-moss-800">Dev OTP: {devOtp}</p>}
            {emailMessage && <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">{emailMessage}</p>}
            {(requestCurrentOtp.isError || requestChangeOtp.isError || verifyCurrentOtp.isError || verifyChangeOtp.isError || removeEmail.isError) && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {[requestCurrentOtp.error, requestChangeOtp.error, verifyCurrentOtp.error, verifyChangeOtp.error, removeEmail.error].find(Boolean) instanceof Error
                  ? ([requestCurrentOtp.error, requestChangeOtp.error, verifyCurrentOtp.error, verifyChangeOtp.error, removeEmail.error].find(Boolean) as Error).message
                  : 'Email verification failed.'}
              </p>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
};

const Label = ({ text, children }: { text: string; children: React.ReactNode }) => <label className="block"><span className="mb-2 block text-sm font-semibold text-stone-700">{text}</span>{children}</label>;
const ProfileSkeleton = () => <div className="space-y-7"><Skeleton className="h-20 w-80" /><div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]"><Skeleton className="h-[400px]" /><Skeleton className="h-[620px]" /></div></div>;
