import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BarChart3, BookOpenText, CalendarDays, CheckCircle2, ClipboardList, GraduationCap, KeyRound, MailCheck, Radio, ScrollText, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/empty-state';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { useAuth } from '../auth/auth-context';

type StudentCard = {
  relationship: string;
  linkedAt: string;
  student: Student;
  metrics: { mockAttempts: number; rcAttempts: number; contentCompleted: number; activeBatches: number; activeSessions: number };
};

type Student = { id: string; name: string; username: string; profileImage: string | null; className: string | null; schoolName: string | null; city: string | null; state: string | null };
type ScoreRow = { id: string; title: string; score: number; totalMarks: number; accuracy: number; submittedAt: string | null };
type ParentDashboard = { parent: ParentProfile; students: StudentCard[] };
type ParentProfile = { id: string; name: string; username: string; email: string; emailVerified: boolean; phoneNumber: string; occupation: string | null; createdAt: string };

export const ParentDashboardPage = () => {
  const query = useQuery({ queryKey: ['parent-dashboard'], queryFn: () => api<ParentDashboard>('/api/v1/parents/dashboard') });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={UsersRound} title="Parent dashboard could not load" description="Please refresh and try again." />;
  const data = query.data;
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-4xl bg-moss-800 px-6 py-8 text-white shadow-card sm:px-8">
        <div className="absolute -right-12 -top-20 size-72 rounded-full bg-lime/15 blur-3xl" />
        <div className="relative">
          <Badge className="bg-white/12 text-lime">PARENT OVERVIEW</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {data.parent.name.split(' ')[0]}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-moss-100/75">Track linked students without changing their learning workspace.</p>
        </div>
      </section>

      {data.students.length ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {data.students.map((item) => <StudentCardView key={item.student.id} item={item} />)}
        </section>
      ) : (
        <EmptyState icon={UsersRound} title="No students linked yet" description="Ask the student to add your parent username from their Account Hub. Once linked, their progress will appear here." />
      )}
    </div>
  );
};

const StudentCardView = ({ item }: { item: StudentCard }) => (
  <Link to={`/parent/students/${item.student.id}`} className="group block">
    <Card className="overflow-hidden p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-float">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={item.student.name} src={item.student.profileImage} className="size-14 rounded-2xl" />
          <div>
            <h2 className="text-xl font-bold">{item.student.name}</h2>
            <p className="mt-1 text-sm text-stone-500">@{item.student.username} · {item.relationship.toLowerCase()}</p>
            <p className="mt-1 text-xs text-stone-400">{[item.student.className, item.student.schoolName].filter(Boolean).join(' · ') || 'Student details not completed'}</p>
          </div>
        </div>
        <ArrowRight className="text-stone-300 transition group-hover:translate-x-1 group-hover:text-moss-700" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MiniStat label="Mocks" value={item.metrics.mockAttempts} />
        <MiniStat label="RC" value={item.metrics.rcAttempts} />
        <MiniStat label="Content" value={item.metrics.contentCompleted} />
        <MiniStat label="Batches" value={item.metrics.activeBatches} />
        <MiniStat label="Live now" value={item.metrics.activeSessions} />
      </div>
    </Card>
  </Link>
);

const MiniStat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-2xl bg-moss-50 p-3">
    <p className="text-lg font-bold text-moss-900">{value}</p>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
  </div>
);

export const ParentStudentHomePage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-student', studentId], queryFn: () => api<{
    student: Student;
    relationship: string;
    metrics: { mockAttempts: number; rcAttempts: number; contentCompletionPercent: number; activeBatches: number };
    latestMocks: ScoreRow[];
    latestRc: ScoreRow[];
    latestContentTests: ScoreRow[];
    activeBatches: { id: string; name: string; description: string; program: { id: string; name: string }; expiryDate: string }[];
  }>(`/api/v1/parents/students/${studentId}`), enabled: Boolean(studentId) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={UserRound} title="Student unavailable" description="This student may not be linked to your parent account." />;
  const data = query.data;
  return (
    <div className="space-y-7">
      <BackHome />
      <section className="rounded-4xl bg-[linear-gradient(135deg,#174b37,#24634a)] p-7 text-white shadow-card">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Badge className="bg-white/12 text-lime">STUDENT WORKSPACE</Badge>
            <h1 className="mt-4 text-3xl font-semibold">{data.student.name}</h1>
            <p className="mt-2 text-sm text-moss-100/75">@{data.student.username} · linked as {data.relationship.toLowerCase()}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label="mock attempts" value={data.metrics.mockAttempts} />
            <HeroStat label="RC attempts" value={data.metrics.rcAttempts} />
            <HeroStat label="content done" value={`${data.metrics.contentCompletionPercent}%`} />
            <HeroStat label="batches" value={data.metrics.activeBatches} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <PillarCard to="mock-tests" icon={ClipboardList} title="Mock tests" text="Submitted mocks, scores, rank and percentile." />
        <PillarCard to="content" icon={BookOpenText} title="Learning content" text="Topic completion and topic test attempts." />
        <PillarCard to="rc" icon={ScrollText} title="RC practice" text="RC attempts, accuracy and streak summary." />
        <PillarCard to="mentorship" icon={UsersRound} title="Mentorship" text="Programs, batches, tasks, classes and tests." />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <ScoreList title="Recent mock scores" rows={data.latestMocks} />
        <ScoreList title="Recent RC scores" rows={data.latestRc} />
        <ScoreList title="Recent topic tests" rows={data.latestContentTests} />
      </section>
    </div>
  );
};

const HeroStat = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-2xl bg-white/12 p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-moss-100/75">{label}</p></div>;

const PillarCard = ({ to, icon: Icon, title, text }: { to: string; icon: typeof ClipboardList; title: string; text: string }) => (
  <Link to={to} className="group block">
    <Card className="h-full p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-float">
      <Icon className="text-moss-700" />
      <h2 className="mt-5 text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-500">{text}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-moss-800">Open <ArrowRight size={15} /></span>
    </Card>
  </Link>
);

const ScoreList = ({ title, rows }: { title: string; rows: ScoreRow[] }) => (
  <Card className="p-6">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="mt-4 space-y-3">
      {rows.length ? rows.map((row) => <ScorePill key={row.id} row={row} />) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">No submitted attempts yet.</p>}
    </div>
  </Card>
);

const ScorePill = ({ row }: { row: ScoreRow }) => (
  <div className="rounded-2xl border border-stone-100 p-4">
    <div className="flex justify-between gap-3 text-sm">
      <span className="font-semibold">{row.title}</span>
      <span className="font-bold text-moss-800">{row.score}/{row.totalMarks}</span>
    </div>
    <div className="mt-2 h-2 rounded-full bg-moss-100"><div className="h-full rounded-full bg-moss-700" style={{ width: `${Math.min(100, row.totalMarks ? (row.score / row.totalMarks) * 100 : 0)}%` }} /></div>
    <p className="mt-2 text-xs text-stone-400">{Math.round(row.accuracy)}% accuracy{row.submittedAt ? ` · ${formatDateTime(row.submittedAt)}` : ''}</p>
  </div>
);

export const ParentMockPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mock-attempts', studentId], queryFn: () => api<{ attempts: (ScoreRow & { rank: number | null; percentile: number | null; timeTakenSeconds: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; examType: string; mockType: string; difficulty: string })[] }>(`/api/v1/parents/students/${studentId}/mock-attempts`) });
  return <AttemptListPage title="Mock test analysis" subtitle="Read-only view of submitted mock attempts." icon={ClipboardList} query={query} meta={(row) => `${row.examType} · ${row.mockType} · ${row.difficulty}`} extra={(row) => <>Rank {row.rank ?? '—'} · Percentile {row.percentile ?? '—'} · {row.correctAnswers}C/{row.incorrectAnswers}W/{row.unattemptedAnswers}U</>} href={(row) => `/parent/students/${studentId}/mock-tests/attempts/${row.id}`} />;
};

export const ParentRcPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-rc', studentId], queryFn: () => api<{ leaderboard: { currentStreak: number; highestStreak: number; totalRcAttempted: number; averageScore: number; lastCompletedAt: string | null } | null; attempts: (ScoreRow & { difficulty: string; testAverageScore: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number })[] }>(`/api/v1/parents/students/${studentId}/rc`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={ScrollText} title="RC progress unavailable" description="Unable to load RC progress." />;
  return (
    <div className="space-y-6">
      <BackHome />
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Radio} label="Current streak" value={query.data.leaderboard?.currentStreak ?? 0} />
        <MetricCard icon={GraduationCap} label="Highest streak" value={query.data.leaderboard?.highestStreak ?? 0} />
        <MetricCard icon={ScrollText} label="RC attempted" value={query.data.leaderboard?.totalRcAttempted ?? query.data.attempts.length} />
        <MetricCard icon={BarChart3} label="Average score" value={query.data.leaderboard?.averageScore ?? 0} />
      </section>
      <AttemptRows title="RC attempts" rows={query.data.attempts} meta={(row) => `${row.difficulty} · Test avg ${row.testAverageScore}`} extra={(row) => `${row.correctAnswers}C/${row.incorrectAnswers}W/${row.unattemptedAnswers}U`} href={(row) => `/parent/students/${studentId}/rc/attempts/${row.id}`} />
    </div>
  );
};

export const ParentContentPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-content', studentId], queryFn: () => api<{
    subjects: { id: string; name: string; description: string; completionPercent: number; totalContent: number; completedContent: number; topics: { id: string; name: string; completionPercent: number; totalContent: number; completedContent: number; tests: { id: string; name: string; attempted: boolean }[]; subtopics: { id: string; name: string; totalContent: number; completedContent: number; contents: { id: string; title: string; contentType: string; completedAt: string | null }[] }[] }[] }[];
    attempts: ScoreRow[];
  }>(`/api/v1/parents/students/${studentId}/content`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={BookOpenText} title="Content progress unavailable" description="Unable to load content progress." />;
  return (
    <div className="space-y-6">
      <BackHome />
      <div>
        <p className="eyebrow">Learning content</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Subject-wise completion</h1>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          {query.data.subjects.map((subject) => (
            <Card key={subject.id} className="p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div><h2 className="text-xl font-bold">{subject.name}</h2><p className="mt-1 text-sm text-stone-500">{subject.completedContent}/{subject.totalContent} materials completed</p></div>
                <ProgressBadge value={subject.completionPercent} />
              </div>
              <div className="mt-5 space-y-3">
                {subject.topics.map((topic) => (
                  <details key={topic.id} className="rounded-2xl border border-stone-100 p-4 open:bg-moss-50/40">
                    <summary className="cursor-pointer list-none font-semibold">{topic.name} <span className="ml-2 text-sm font-normal text-stone-500">{topic.completionPercent}% complete</span></summary>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {topic.subtopics.map((subtopic) => <div key={subtopic.id} className="rounded-2xl bg-white p-4"><p className="font-semibold">{subtopic.name}</p><p className="mt-1 text-xs text-stone-500">{subtopic.completedContent}/{subtopic.totalContent} done</p></div>)}
                    </div>
                    {topic.tests.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{topic.tests.map((test) => <Badge key={test.id} className={test.attempted ? 'bg-moss-100 text-moss-800' : 'bg-stone-100 text-stone-600'}>{test.name}: {test.attempted ? 'attempted' : 'not attempted'}</Badge>)}</div>}
                  </details>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <ScoreList title="Recent topic test attempts" rows={query.data.attempts} />
      </div>
    </div>
  );
};

export const ParentMentorshipProgramsPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentorship-programs', studentId], queryFn: () => api<{ programs: { id: string; name: string; description: string; _count: { batches: number } }[] }>(`/api/v1/parents/students/${studentId}/mentorship/programs`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={UsersRound} title="Mentorship unavailable" description="Unable to load mentorship programs." />;
  return (
    <div className="space-y-6">
      <BackHome />
      <h1 className="text-3xl font-bold tracking-tight">Mentorship programs</h1>
      <section className="grid gap-5 lg:grid-cols-2">
        {query.data.programs.length ? query.data.programs.map((program) => (
          <Link key={program.id} to={`programs/${program.id}/batches`}><Card className="p-6 transition hover:-translate-y-0.5 hover:shadow-float"><Badge>{program._count.batches} linked batches</Badge><h2 className="mt-4 text-xl font-bold">{program.name}</h2><p className="mt-2 text-sm leading-6 text-stone-500">{program.description}</p></Card></Link>
        )) : <EmptyState icon={UsersRound} title="No mentorship access" description="Linked mentorship programs will appear here." />}
      </section>
    </div>
  );
};

export const ParentMentorshipBatchesPage = () => {
  const { studentId = '', programId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentorship-batches', studentId, programId], queryFn: () => api<{ batches: { id: string; name: string; description: string; mentorAssignments: { mentor: { name: string; qualification: string } }[]; _count: { tasks: number; liveSessions: number; tests: number } }[] }>(`/api/v1/parents/students/${studentId}/mentorship/programs/${programId}/batches`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={UsersRound} title="Batches unavailable" description="Unable to load mentorship batches." />;
  return (
    <div className="space-y-6">
      <BackHome />
      <h1 className="text-3xl font-bold tracking-tight">Linked batches</h1>
      <section className="grid gap-5 lg:grid-cols-2">
        {query.data.batches.map((batch) => <Link key={batch.id} to={`/parent/students/${studentId}/mentorship/batches/${batch.id}`}><Card className="p-6 transition hover:-translate-y-0.5 hover:shadow-float"><h2 className="text-xl font-bold">{batch.name}</h2><p className="mt-2 text-sm text-stone-500">{batch.description}</p><div className="mt-5 grid grid-cols-3 gap-3"><MiniStat label="tasks" value={batch._count.tasks} /><MiniStat label="classes" value={batch._count.liveSessions} /><MiniStat label="tests" value={batch._count.tests} /></div><p className="mt-4 text-xs text-stone-400">Mentors: {batch.mentorAssignments.map((item) => item.mentor.name).join(', ') || 'Not assigned'}</p></Card></Link>)}
      </section>
    </div>
  );
};

export const ParentMentorshipBatchPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentorship-batch', studentId, batchId], queryFn: () => api<{ batch: { id: string; name: string; description: string; program: { name: string }; mentors: { name: string; qualification: string }[]; tasks: { id: string; title: string; endDatetime: string; status: string; completedAt: string | null; isActiveNow: boolean }[]; sessions: { id: string; title: string; startDatetime: string; endDatetime: string; attended: boolean; isActiveNow: boolean }[]; notices: { id: string; title: string; description: string; createdAt: string }[]; tests: { id: string; name: string; totalMarks: number; startDatetime: string; endDatetime: string; attempted: boolean; attemptId: string | null; score: number | null; isActiveNow: boolean }[] } }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={UsersRound} title="Batch unavailable" description="Unable to load this mentorship batch." />;
  const batch = query.data.batch;
  return (
    <div className="space-y-6">
      <BackHome />
      <section className="rounded-4xl bg-moss-800 p-7 text-white">
        <Badge className="bg-white/12 text-lime">{batch.program.name}</Badge>
        <h1 className="mt-4 text-3xl font-bold">{batch.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">{batch.description}</p>
        <p className="mt-5 text-sm text-moss-100/75">Mentors: {batch.mentors.map((mentor) => mentor.name).join(', ') || 'Not assigned'}</p>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <InfoList title="Tasks" rows={batch.tasks.map((task) => ({ id: task.id, title: task.title, meta: `Ends ${formatDateTime(task.endDatetime)}`, badge: task.completedAt ? 'Completed' : task.isActiveNow ? 'Active' : 'Past' }))} />
        <InfoList title="Live classes" rows={batch.sessions.map((session) => ({ id: session.id, title: session.title, meta: `${formatDateTime(session.startDatetime)} — ${formatDateTime(session.endDatetime)}`, badge: session.attended ? 'Attended' : session.isActiveNow ? 'Live now' : 'Not attended' }))} />
        <InfoList title="Batch tests" rows={batch.tests.map((test) => ({ id: test.id, title: test.name, meta: `${test.totalMarks} marks · ends ${formatDateTime(test.endDatetime)}`, badge: test.attempted ? `Scored ${test.score}/${test.totalMarks}` : test.isActiveNow ? 'Available' : 'Not attempted', href: test.attempted && test.attemptId ? `/parent/students/${studentId}/mentorship/batch-attempts/${test.attemptId}` : undefined }))} />
        <InfoList title="Latest notices" rows={batch.notices.map((notice) => ({ id: notice.id, title: notice.title, meta: notice.description, badge: formatDateTime(notice.createdAt) }))} />
      </section>
    </div>
  );
};

export const ParentProfilePage = () => {
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['parent-profile'], queryFn: () => api<{ profile: ParentProfile }>('/api/v1/parents/me') });
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [changeEmail, setChangeEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (form: Record<string, unknown>) => api<{ profile: ParentProfile }>('/api/v1/parents/me', { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['parent-profile'] }); setMessage('Profile updated.'); },
  });
  const verifyRequest = useMutation({
    mutationFn: () => api<{ verification: { devOtp: string | null; alreadyVerified?: boolean } }>('/api/v1/parents/email-verification/request', { method: 'POST' }),
    onSuccess: (result) => { setDevOtp(result.verification.devOtp); setMessage(result.verification.alreadyVerified ? 'Email is already verified.' : 'OTP sent.'); },
  });
  const verifyOtp = useMutation({
    mutationFn: () => api('/api/v1/parents/email-verification/verify', { method: 'POST', body: JSON.stringify({ otp }) }),
    onSuccess: async () => { setOtp(''); setDevOtp(null); await queryClient.invalidateQueries({ queryKey: ['parent-profile'] }); await refresh(); setMessage('Email verified.'); },
  });
  const emailChangeRequest = useMutation({
    mutationFn: () => api<{ verification: { devOtp: string | null } }>('/api/v1/parents/email-verification/change/request', { method: 'POST', body: JSON.stringify({ email: changeEmail }) }),
    onSuccess: (result) => { setDevOtp(result.verification.devOtp); setMessage('OTP sent to the new email.'); },
  });
  const emailChangeVerify = useMutation({
    mutationFn: () => api('/api/v1/parents/email-verification/change/verify', { method: 'POST', body: JSON.stringify({ email: changeEmail, otp }) }),
    onSuccess: async () => { setOtp(''); setChangeEmail(''); setDevOtp(null); await queryClient.invalidateQueries({ queryKey: ['parent-profile'] }); await refresh(); setMessage('Email changed and verified.'); },
  });
  const passwordMutation = useMutation({
    mutationFn: (form: Record<string, unknown>) => api('/api/v1/parents/password', { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => setMessage('Password changed successfully.'),
  });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={ShieldCheck} title="Profile unavailable" description="Unable to load parent profile." />;
  const profile = query.data.profile;
  const submitProfile = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); mutation.mutate(Object.fromEntries(new FormData(event.currentTarget))); };
  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    if (form.newPassword !== form.confirmPassword) { setMessage('New passwords do not match.'); return; }
    passwordMutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <Card className="p-6">
        <Badge className={profile.emailVerified ? 'bg-moss-100 text-moss-800' : 'bg-amber/20 text-[#8a5b00]'}>{profile.emailVerified ? 'Email verified' : 'Email not verified'}</Badge>
        <h1 className="mt-4 text-2xl font-bold">Parent profile</h1>
        <form onSubmit={submitProfile} className="mt-5 space-y-4">
          <Label text="Full name"><Input name="name" defaultValue={profile.name} required /></Label>
          <Label text="Phone number"><Input name="phoneNumber" defaultValue={profile.phoneNumber} required /></Label>
          <Label text="Occupation"><Input name="occupation" defaultValue={profile.occupation ?? ''} /></Label>
          <Button disabled={mutation.isPending}>Save profile</Button>
        </form>
        {message && <p className="mt-4 rounded-2xl bg-moss-50 p-3 text-sm font-medium text-moss-800">{message}</p>}
      </Card>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3"><MailCheck className="text-moss-700" /><h2 className="text-xl font-bold">Email verification</h2></div>
          <p className="mt-2 text-sm text-stone-500">{profile.email}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => verifyRequest.mutate()} disabled={verifyRequest.isPending}>Send verification OTP</Button>
            <Input className="max-w-40" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit OTP" />
            <Button onClick={() => verifyOtp.mutate()} disabled={otp.length !== 6 || verifyOtp.isPending}>Verify</Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input value={changeEmail} onChange={(event) => setChangeEmail(event.target.value)} placeholder="new@email.com" type="email" />
            <Button variant="outline" onClick={() => emailChangeRequest.mutate()} disabled={!changeEmail || emailChangeRequest.isPending}>Send change OTP</Button>
            <Button onClick={() => emailChangeVerify.mutate()} disabled={!changeEmail || otp.length !== 6 || emailChangeVerify.isPending}>Confirm change</Button>
          </div>
          {devOtp && <p className="mt-3 rounded-xl bg-lime/30 px-3 py-2 text-sm font-bold text-moss-900">Local dev OTP: {devOtp}</p>}
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3"><KeyRound className="text-moss-700" /><h2 className="text-xl font-bold">Change password</h2></div>
          <form onSubmit={submitPassword} className="mt-5 grid gap-4 sm:grid-cols-3">
            <Input name="currentPassword" type="password" placeholder="Current password" required />
            <Input name="newPassword" type="password" placeholder="New password" minLength={10} required />
            <Input name="confirmPassword" type="password" placeholder="Confirm password" minLength={10} required />
            <Button className="sm:col-span-3" disabled={passwordMutation.isPending}>Update password</Button>
          </form>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-moss-800 hover:underline">Forgot current password?</Link>
        </Card>
      </div>
    </div>
  );
};

export const ParentMockAttemptAnalysisPage = () => {
  const { studentId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mock-attempt', studentId, attemptId], queryFn: () => api<{ analysis: AttemptAnalysis }>(`/api/v1/parents/students/${studentId}/mock-attempts/${attemptId}`).then((response) => response.analysis) });
  return <ParentAttemptDetail title="Mock analysis" query={query} />;
};

export const ParentRcAttemptDetailPage = () => {
  const { studentId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-rc-attempt', studentId, attemptId], queryFn: () => api<AttemptDetail>(`/api/v1/parents/students/${studentId}/rc-attempts/${attemptId}`) });
  return <ParentAttemptDetail title="RC attempt" query={query} unwrap="attempt" />;
};

export const ParentBatchAttemptAnalysisPage = () => {
  const { studentId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-batch-attempt', studentId, attemptId], queryFn: () => api<{ analysis: AttemptAnalysis }>(`/api/v1/parents/students/${studentId}/mentorship/batch-attempts/${attemptId}`).then((response) => response.analysis) });
  return <ParentAttemptDetail title="Batch test analysis" query={query} />;
};

const AttemptListPage = ({ title, subtitle, icon: Icon, query, meta, extra, href }: { title: string; subtitle: string; icon: typeof ClipboardList; query: ReturnType<typeof useQuery<{ attempts: any[] }>>; meta: (row: any) => string; extra: (row: any) => React.ReactNode; href?: (row: any) => string }) => {
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={Icon} title={`${title} unavailable`} description="Unable to load attempts." />;
  return <div className="space-y-6"><BackHome /><div><p className="eyebrow">Parent view</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm text-stone-500">{subtitle}</p></div><AttemptRows title="Submitted attempts" rows={query.data.attempts} meta={meta} extra={extra} href={href} /></div>;
};

const AttemptRows = ({ title, rows, meta, extra, href }: { title: string; rows: any[]; meta: (row: any) => string; extra: (row: any) => React.ReactNode; href?: (row: any) => string }) => (
  <Card className="overflow-hidden">
    <div className="border-b border-stone-100 px-6 py-5"><h2 className="text-xl font-bold">{title}</h2></div>
    {rows.length ? rows.map((row) => {
      const content = (
        <>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h3 className="font-bold">{row.title}</h3><p className="mt-1 text-sm text-stone-500">{meta(row)}</p><p className="mt-1 text-xs text-stone-400">{row.submittedAt ? formatDateTime(row.submittedAt) : 'Submitted'}</p></div>
          <div className="text-left sm:text-right"><p className="text-xl font-bold text-moss-800">{row.score}/{row.totalMarks}</p><p className="text-sm text-stone-500">{Math.round(row.accuracy)}% accuracy</p></div>
        </div>
        <p className="mt-3 text-xs font-medium text-stone-500">{extra(row)}</p>
        </>
      );
      return href ? <Link key={row.id} to={href(row)} className="block border-b border-stone-100 px-6 py-5 transition last:border-0 hover:bg-moss-50/50">{content}</Link> : <div key={row.id} className="border-b border-stone-100 px-6 py-5 last:border-0">{content}</div>;
    }) : <div className="p-6"><EmptyState compact icon={CheckCircle2} title="No attempts yet" description="Submitted attempts will appear here." /></div>}
  </Card>
);

const ParentAttemptDetail = ({ title, query, unwrap }: { title: string; query: ReturnType<typeof useQuery<any>>; unwrap?: 'attempt' }) => {
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={BarChart3} title="Attempt unavailable" description="Unable to load this submitted attempt." />;
  const payload = unwrap ? query.data[unwrap] : query.data;
  const attempt = payload.attempt ?? payload;
  const test = payload.test ?? attempt.test ?? {};
  const answers: AnswerReview[] = payload.answers ?? [];
  const sections: SectionReview[] = payload.sections ?? [];
  return (
    <div className="space-y-6">
      <BackHome />
      <section className="rounded-4xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">READ ONLY</Badge>
        <h1 className="mt-4 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-moss-100/75">{test.name ?? test.title ?? 'Submitted test'}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          <HeroStat label="score" value={`${attempt.marksScored ?? 0}/${attempt.totalMarks ?? 0}`} />
          <HeroStat label="accuracy" value={`${Math.round(attempt.accuracy ?? 0)}%`} />
          <HeroStat label="correct" value={attempt.correctAnswers ?? 0} />
          <HeroStat label="incorrect" value={attempt.incorrectAnswers ?? 0} />
          <HeroStat label="unattempted" value={attempt.unattemptedAnswers ?? 0} />
        </div>
      </section>
      {sections.length > 0 && <InfoList title="Section performance" rows={sections.map((section) => ({ id: section.id, title: section.name, meta: `${section.marksScored}/${section.totalMarks ?? '—'} marks · ${Math.round(section.accuracy ?? 0)}% accuracy`, badge: `${section.correctAnswers ?? 0}C/${section.incorrectAnswers ?? 0}W/${section.unattemptedAnswers ?? 0}U` }))} />}
      <Card className="overflow-hidden">
        <div className="border-b border-stone-100 px-6 py-5"><h2 className="text-xl font-bold">Answer review</h2><p className="mt-1 text-sm text-stone-500">Read-only view of selected answers, correct answers and explanations.</p></div>
        {answers.length ? answers.map((answer, index) => <AnswerCard key={answer.id ?? index} answer={answer} index={index} />) : <div className="p-6"><EmptyState compact icon={CheckCircle2} title="No answer rows" description="Answer review is not available for this attempt." /></div>}
      </Card>
    </div>
  );
};

const AnswerCard = ({ answer, index }: { answer: AnswerReview; index: number }) => (
  <div className="border-b border-stone-100 p-6 last:border-0">
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Q{answer.questionNumber ?? index + 1}</Badge>
      <Badge className={answer.status === 'CORRECT' ? 'bg-moss-100 text-moss-800' : answer.status === 'UNATTEMPTED' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-700'}>{answer.status}</Badge>
      {answer.sectionName && <Badge className="bg-lime/30 text-moss-900">{answer.sectionName}</Badge>}
      <Badge className="bg-stone-100 text-stone-700">{answer.marksAwarded ?? 0} marks</Badge>
    </div>
    <p className="mt-4 font-semibold leading-7">{answer.question}</p>
    {Array.isArray(answer.options) && <div className="mt-4 grid gap-2">
      {answer.options.map((option, optionIndex) => {
        const key = optionKey(option, optionIndex);
        const selected = selectedSet(answer.selectedAnswers).has(key);
        const correct = selectedSet(answer.correctAnswers).has(key);
        return <div key={`${key}-${optionIndex}`} className={`rounded-2xl border px-4 py-3 text-sm ${correct ? 'border-moss-200 bg-moss-50' : selected ? 'border-red-100 bg-red-50' : 'border-stone-100 bg-white'}`}><span className="font-bold">{key}.</span> {optionText(option)}</div>;
      })}
    </div>}
    <p className="mt-4 text-sm text-stone-600">Student answer: <span className="font-semibold text-ink">{selectedSet(answer.selectedAnswers).size ? Array.from(selectedSet(answer.selectedAnswers)).join(', ') : 'Unattempted'}</span> · Correct answer: <span className="font-semibold text-moss-800">{Array.from(selectedSet(answer.correctAnswers)).join(', ')}</span></p>
    {answer.explanation && <div className="mt-4 rounded-2xl bg-lime/20 p-4 text-sm leading-6 text-moss-950"><span className="font-bold">Explanation: </span>{answer.explanation}</div>}
  </div>
);

const InfoList = ({ title, rows }: { title: string; rows: { id: string; title: string; meta: string; badge: string; href?: string }[] }) => (
  <Card className="p-6">
    <h2 className="text-xl font-bold">{title}</h2>
    <div className="mt-4 space-y-3">
      {rows.length ? rows.map((row) => {
        const content = <><div className="flex justify-between gap-3"><p className="font-semibold">{row.title}</p><Badge className="shrink-0">{row.badge}</Badge></div><p className="mt-2 line-clamp-2 text-sm text-stone-500">{row.meta}</p></>;
        return row.href ? <Link key={row.id} to={row.href} className="block rounded-2xl border border-stone-100 p-4 transition hover:bg-moss-50/60">{content}</Link> : <div key={row.id} className="rounded-2xl border border-stone-100 p-4">{content}</div>;
      }) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">Nothing posted yet.</p>}
    </div>
  </Card>
);

const MetricCard = ({ icon: Icon, label, value }: { icon: typeof Radio; label: string; value: string | number }) => <Card className="p-5"><Icon className="text-moss-700" /><p className="mt-4 text-2xl font-bold">{value}</p><p className="text-sm text-stone-500">{label}</p></Card>;
const ProgressBadge = ({ value }: { value: number }) => <span className="rounded-full bg-lime/35 px-3 py-1.5 text-sm font-bold text-moss-900">{value}% complete</span>;
const BackHome = () => <Link to="/parent/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-moss-800 hover:underline">← Parent dashboard</Link>;
const Label = ({ text, children }: { text: string; children: React.ReactNode }) => <label className="block"><span className="mb-2 block text-sm font-semibold text-stone-700">{text}</span>{children}</label>;
const PageSkeleton = () => <div className="space-y-6"><Skeleton className="h-44 rounded-4xl" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div></div>;

type AttemptAnalysis = { attempt: any; test: any; sections?: SectionReview[]; answers?: AnswerReview[] };
type AttemptDetail = { attempt?: any; test?: any; answers?: AnswerReview[]; sections?: SectionReview[] };
type SectionReview = { id: string; name: string; totalMarks?: number; marksScored?: number; accuracy?: number; correctAnswers?: number; incorrectAnswers?: number; unattemptedAnswers?: number };
type AnswerReview = { id?: string; questionNumber?: number; sectionName?: string; status?: string; marksAwarded?: number; question?: string; options?: unknown; selectedAnswers?: unknown; correctAnswers?: unknown; explanation?: string };

const selectedSet = (value: unknown) => new Set(Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)]);
const optionKey = (option: unknown, index: number) => typeof option === 'object' && option && 'id' in option ? String((option as { id: unknown }).id) : String.fromCharCode(65 + index);
const optionText = (option: unknown) => {
  if (typeof option === 'string' || typeof option === 'number') return String(option);
  if (option && typeof option === 'object') {
    const record = option as Record<string, unknown>;
    return String(record.text ?? record.label ?? record.value ?? JSON.stringify(record));
  }
  return String(option ?? '');
};
