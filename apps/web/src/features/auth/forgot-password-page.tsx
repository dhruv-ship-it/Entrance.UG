import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/api';
import type { Role } from './auth-context';
import { AuthFrame } from './login-page';

const roles: { value: Role; label: string }[] = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'MENTOR', label: 'Mentor' },
  { value: 'ADMIN', label: 'Admin' },
];

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('STUDENT');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');

  const requestOtp = useMutation({
    mutationFn: () => api<{ message: string; devOtp: string | null }>('/api/v1/auth/forgot-password/request', {
      method: 'POST',
      body: JSON.stringify({ role, username }),
    }),
    onSuccess: (data) => {
      setMessage(data.message);
      setDevOtp(data.devOtp);
      setStep('reset');
    },
  });

  const resetPassword = useMutation({
    mutationFn: () => api<{ message: string }>('/api/v1/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ role, username, otp, password }),
    }),
    onSuccess: (data) => {
      setMessage(data.message);
      setTimeout(() => navigate('/login', { replace: true }), 900);
    },
  });

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setDevOtp(null);
    requestOtp.mutate();
  };

  const submitReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    resetPassword.mutate();
  };

  const passwordsMatch = password === confirmPassword;

  return (
    <AuthFrame title="Reset your password" subtitle="Enter your role and username. If a verified email exists, we will send a reset OTP.">
      {step === 'request' ? (
        <form className="space-y-5" onSubmit={submitRequest}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-stone-700">Account type</legend>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((item) => (
                <button type="button" key={item.value} onClick={() => setRole(item.value)} className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${role === item.value ? 'border-moss-700 bg-moss-50 text-moss-800' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700"><KeyRound size={15} className="text-moss-700" />Username</span>
            <Input required value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} autoComplete="username" placeholder="your_username" />
          </label>
          {requestOtp.isError && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{requestOtp.error instanceof Error ? requestOtp.error.message : 'Could not request password reset.'}</p>}
          <Button className="w-full" size="lg" disabled={username.trim().length < 3 || requestOtp.isPending}>{requestOtp.isPending ? 'Sending OTP...' : 'Send reset OTP'}</Button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={submitReset}>
          <div className="rounded-3xl border border-moss-100 bg-moss-50 p-5">
            <Badge className="bg-lime/40 text-moss-900"><MailCheck size={13} />Reset OTP</Badge>
            <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
            {devOtp && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-moss-800">Local dev OTP: {devOtp}</p>}
          </div>
          <Input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit OTP" />
          <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={10} autoComplete="new-password" placeholder="New password, minimum 10 characters" />
          <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={10} autoComplete="new-password" placeholder="Confirm new password" />
          {!passwordsMatch && confirmPassword && <p className="rounded-xl bg-amber/15 px-3 py-2 text-sm text-[#8d620f]">Passwords do not match yet.</p>}
          {resetPassword.isError && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{resetPassword.error instanceof Error ? resetPassword.error.message : 'Could not reset password.'}</p>}
          <Button className="w-full" size="lg" disabled={otp.length !== 6 || password.length < 10 || !passwordsMatch || resetPassword.isPending}>{resetPassword.isPending ? 'Resetting...' : 'Reset password'}</Button>
          <Button className="w-full" type="button" variant="ghost" onClick={() => setStep('request')}>Use another account</Button>
        </form>
      )}
      <Link className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-moss-800 hover:underline" to="/login"><ArrowLeft size={15} />Back to sign in</Link>
    </AuthFrame>
  );
};
