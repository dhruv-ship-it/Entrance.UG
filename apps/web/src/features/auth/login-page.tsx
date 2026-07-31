import { useState, type FormEvent } from 'react';
import { GraduationCap, LockKeyhole, Mail, ArrowRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { dashboardPath, type Role, useAuth } from './auth-context';

const roles: { value: Role; label: string }[] = [
  { value: 'STUDENT', label: 'Student' }, { value: 'PARENT', label: 'Parent' }, { value: 'MENTOR', label: 'Mentor' }, { value: 'ADMIN', label: 'Admin' },
];

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<Role>('STUDENT');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await login({ role, email: String(form.get('email')), password: String(form.get('password')) });
      navigate((location.state as { from?: Location })?.from?.pathname ?? dashboardPath(user), { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.'); }
    finally { setIsSubmitting(false); }
  };

  return <AuthFrame title="Welcome back" subtitle="Pick up your preparation right where you left off.">
    <form className="space-y-5" onSubmit={submit}>
      <fieldset><legend className="mb-2 text-sm font-semibold text-stone-700">Sign in as</legend><div className="grid grid-cols-2 gap-2">
        {roles.map((item) => <button type="button" key={item.value} onClick={() => setRole(item.value)} className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${role === item.value ? 'border-moss-700 bg-moss-50 text-moss-800' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>{item.label}</button>)}
      </div></fieldset>
      <Field label="Email address" icon={Mail}><Input required name="email" type="email" autoComplete="email" placeholder="you@example.com" /></Field>
      <Field label="Password" icon={LockKeyhole}><Input required name="password" type="password" autoComplete="current-password" placeholder="Your password" /></Field>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
      <Button className="w-full" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</Button>
    </form>
    <p className="mt-7 text-center text-sm text-stone-500">New to Entrance UG? <Link className="font-semibold text-moss-800 hover:underline" to="/signup">Create a student account</Link></p>
  </AuthFrame>;
};

const Field = ({ label, icon: Icon, children }: { label: string; icon: typeof Mail; children: React.ReactNode }) => <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700"><Icon size={15} className="text-moss-700" />{label}</span>{children}</label>;

export const AuthFrame = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => <main className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#e4efd7,transparent_35%),linear-gradient(135deg,#f8f9f5,#f3f4ee)] px-5 py-8 sm:grid sm:place-items-center">
  <div className="grid w-full max-w-5xl overflow-hidden rounded-4xl border border-white/80 bg-white shadow-float lg:grid-cols-[.9fr_1.1fr]">
    <aside className="relative hidden min-h-[660px] overflow-hidden bg-moss-800 p-10 text-white lg:block"><div className="absolute -right-24 -top-20 size-72 rounded-full bg-lime/25 blur-2xl" /><div className="relative"><div className="mb-20 flex items-center gap-3 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-white/12"><GraduationCap /></span>Entrance UG</div><p className="eyebrow text-lime">A calmer way to prepare</p><h2 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">Make every focused hour count.</h2><p className="mt-5 max-w-sm text-sm leading-7 text-white/70">Mocks, content, mentorship and RC practice—structured around your entrance goals.</p></div><div className="absolute bottom-10 right-10 left-10 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur"><p className="text-sm leading-6 text-white/80">“One dashboard. A clearer plan. Better decisions every week.”</p></div></aside>
    <section className="p-7 sm:p-10 lg:p-12"><Link to="/" className="mb-14 flex items-center gap-2 font-bold text-moss-800 lg:hidden"><GraduationCap /> Entrance UG</Link><p className="eyebrow">Student portal</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{title}</h1><p className="mt-2 mb-8 text-sm leading-6 text-stone-500">{subtitle}</p>{children}</section>
  </div>
</main>;

