import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { dashboardPath, useAuth } from './auth-context';
import { AuthFrame } from './login-page';

export const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await signup(Object.fromEntries(form));
      navigate(dashboardPath(user), { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFrame title="Create your study space" subtitle="Student accounts are free to create. You can personalise the rest later.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Full name"><Input required name="name" minLength={2} placeholder="Your name" /></Label>
          <Label text="Username"><Input required name="username" minLength={3} maxLength={50} pattern="[a-z0-9_]+" placeholder="your_username" /></Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Phone number"><Input required name="phoneNumber" placeholder="+919876543210" /></Label>
          <Label text="Email address"><Input required name="email" type="email" placeholder="you@example.com" /></Label>
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
      <p className="mt-7 text-center text-sm text-stone-500">Already have an account? <Link className="font-semibold text-moss-800 hover:underline" to="/login">Sign in</Link></p>
    </AuthFrame>
  );
};

const Label = ({ text, children }: { text: string; children: React.ReactNode }) => <label className="block"><span className="mb-2 block text-sm font-semibold text-stone-700">{text}</span>{children}</label>;
