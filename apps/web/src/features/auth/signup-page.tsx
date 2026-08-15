import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MailCheck } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/api';
import { dashboardPath, type AuthUser, useAuth } from './auth-context';
import { AuthFrame } from './login-page';

export const SignupPage = () => {
  const { signup, refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pending, setPending] = useState<{ user: AuthUser; email: string; devOtp: string | null } | null>(null);
  const [otp, setOtp] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await signup(Object.fromEntries(form));
      if (result.verification) {
        setPending({ user: result.user, email: result.verification.email, devOtp: result.verification.devOtp });
        return;
      }
      navigate(dashboardPath(result.user), { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verify = useMutation({
    mutationFn: () => api('/api/v1/students/email-verification/verify', { method: 'POST', body: JSON.stringify({ otp }) }),
    onSuccess: async () => {
      await refresh();
      navigate(pending ? dashboardPath(pending.user) : '/student/dashboard', { replace: true });
    },
  });

  if (pending) {
    return (
      <AuthFrame title="Verify your email" subtitle="Enter the OTP generated for your email to complete email verification.">
        <div className="space-y-5">
          <div className="rounded-3xl border border-moss-100 bg-moss-50 p-5">
            <Badge className="bg-lime/40 text-moss-900"><MailCheck size={13} />Email OTP</Badge>
            <h2 className="mt-4 text-lg font-bold text-moss-950">{pending.email}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Your account is created. Verify this email now, or skip and verify later from Profile.</p>
            {pending.devOtp && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-moss-800">Local dev OTP: {pending.devOtp}</p>}
          </div>
          <Input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit OTP" />
          {verify.isError && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{verify.error instanceof Error ? verify.error.message : 'Unable to verify OTP.'}</p>}
          <Button className="w-full" size="lg" disabled={otp.length !== 6 || verify.isPending} onClick={() => verify.mutate()}>{verify.isPending ? 'Verifying...' : 'Verify email'}</Button>
          <Button className="w-full" variant="ghost" onClick={() => navigate(dashboardPath(pending.user), { replace: true })}>Skip for now</Button>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create your study space" subtitle="Student accounts are free to create. You can personalise the rest later.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Full name"><Input required name="name" minLength={2} placeholder="Your name" /></Label>
          <Label text="Username"><Input required name="username" minLength={3} maxLength={50} pattern="[a-z0-9_]+" placeholder="your_username" /></Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Phone number"><Input required name="phoneNumber" placeholder="+919876543210" /></Label>
          <Label text="Email address (optional)"><Input name="email" type="email" placeholder="you@example.com" /></Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Date of birth"><Input required name="dateOfBirth" type="date" /></Label>
          <Label text="Gender">
            <select required name="gender" className="focus-ring h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm">
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </Label>
        </div>
        <Label text="Password"><Input required name="password" type="password" minLength={10} autoComplete="new-password" placeholder="At least 10 characters" /></Label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
        <Button className="w-full" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : <>Create account <ArrowRight size={17} /></>}</Button>
      </form>
      <p className="mt-7 text-center text-sm text-stone-500">
        Already have an account? <Link className="font-semibold text-moss-800 hover:underline" to="/login">Sign in</Link>
        <span className="mx-2 text-stone-300">/</span>
        <Link className="font-semibold text-moss-800 hover:underline" to="/forgot-password">Forgot password?</Link>
      </p>
    </AuthFrame>
  );
};

const Label = ({ text, children }: { text: string; children: React.ReactNode }) => <label className="block"><span className="mb-2 block text-sm font-semibold text-stone-700">{text}</span>{children}</label>;
