import { useMutation, useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpenText, ChevronLeft, Flame, ListChecks, Medal, PlayCircle, Timer, Trophy } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn, formatDateTime } from '../../../lib/utils';

type Phase = 'LIVE' | 'UPCOMING' | 'PAST';
type RcTest = {
  id: string;
  title: string;
  instructions: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes?: number | null;
  totalMarks: number;
  difficulty: string;
  questionCount: number;
  phase: Phase;
  attempted: boolean;
  latestAttempt?: { id: string; submittedAt?: string | null; marksScored: number; accuracy: number } | null;
  analytics?: { totalAttempts: number; averageScore: number; highestScore: number; lowestScore: number; averageAccuracy: number; averageTimeTakenSeconds: number } | null;
};
type Attempt = {
  id: string;
  startedAt: string;
  submittedAt?: string | null;
  timeTakenSeconds: number;
  totalMarks: number;
  marksScored: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unattemptedAnswers: number;
  accuracy: number;
  test: { id: string; title: string; difficulty?: string; questionCount?: number; averageScore?: number };
};
type LeaderboardEntry = {
  rank: number;
  studentId: string;
  currentStreak: number;
  storedCurrentStreak?: number;
  highestStreak: number;
  totalRcAttempted: number;
  averageScore: number;
  lastCompletedDate?: string | null;
  lastCompletedAt?: string | null;
  streakExpiresAt?: string | null;
  isCurrentStudent?: boolean;
  student: { id: string; name: string; profileImage?: string | null };
};
type Dashboard = {
  activeTests: RcTest[];
  recentAttempts: Attempt[];
  leaderboard: LeaderboardEntry[];
  myLeaderboard?: LeaderboardEntry | null;
  scoreTrend: { attemptId: string; testTitle: string; submittedAt?: string | null; score: number; averageScore: number }[];
};
type TestDetail = RcTest & {
  passage: string;
  difficulty: { name: string; description: string };
  latestAttemptId?: string | null;
  questions: { id: string; sequenceNumber: number; questionType: string; positiveMarks: number; negativeMarks: number }[];
};
type AttemptDetail = Attempt & {
  test: { id: string; title: string; passage: string; difficulty: string; analytics?: { averageScore: number; highestScore: number; averageAccuracy: number } | null };
  answers: { id: string; questionNumber: number; question: string; options: unknown; selectedAnswers: unknown; correctAnswers: unknown; status: string; marksAwarded: number; timeTakenSeconds: number; explanation: string }[];
};

const phaseBadge = (phase: Phase) => cn(
  phase === 'LIVE' && 'bg-lime/45 text-moss-900',
  phase === 'UPCOMING' && 'bg-sky-100 text-sky-800',
  phase === 'PAST' && 'bg-stone-100 text-stone-600',
);

const phaseText = (phase: Phase) => phase === 'LIVE' ? 'Active' : phase === 'UPCOMING' ? 'Upcoming' : 'Past';

const MiniMetric = ({ label, value, icon: Icon, className }: { label: string; value: string | number; icon: typeof Trophy; className?: string }) => (
  <div className={cn('rounded-2xl p-4', className ?? 'bg-stone-50')}>
    <Icon size={18} className="text-moss-700" />
    <p className="mt-3 text-2xl font-semibold">{value}</p>
    <p className="text-xs font-medium text-stone-500">{label}</p>
  </div>
);

const TestCard = ({ test }: { test: RcTest }) => (
  <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:border-moss-200 hover:shadow-card">
    <div className="flex flex-wrap items-center gap-2">
      {test.phase === 'LIVE' && <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(34,197,94,.15)]" />}
      <Badge className={phaseBadge(test.phase)}>{phaseText(test.phase)}</Badge>
      <Badge>{test.difficulty}</Badge>
      <Badge className={test.attempted ? 'bg-moss-100 text-moss-800' : 'bg-stone-100 text-stone-600'}>{test.attempted ? 'Attempted' : 'Not attempted'}</Badge>
    </div>
    <h2 className="mt-4 text-lg font-bold">{test.title}</h2>
    <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{test.instructions}</p>
    <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-stone-500">
      <span>{test.questionCount} questions</span>
      <span>{test.totalMarks} marks</span>
      <span>{test.durationMinutes ?? 20} min</span>
      <span>Ends {formatDateTime(test.endDatetime)}</span>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      <Link to={`/student/rc/tests/${test.id}`}><Button size="sm" variant="outline">View details</Button></Link>
      {test.latestAttempt?.id && <Link to={`/student/rc/attempts/${test.latestAttempt.id}`}><Button size="sm">View analysis</Button></Link>}
    </div>
  </div>
);

const AttemptCard = ({ attempt }: { attempt: Attempt }) => (
  <Link to={`/student/rc/attempts/${attempt.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-moss-200 hover:shadow-card">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">{attempt.test.title}</h3>
        <p className="mt-1 text-sm text-stone-500">{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'Not submitted'}</p>
      </div>
      <Badge className="bg-lime/40 text-moss-900">{attempt.marksScored}/{attempt.totalMarks}</Badge>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-stone-500">
      <span>{attempt.accuracy}% accuracy</span>
      <span>{attempt.correctAnswers} correct</span>
      <span>{Math.round(attempt.timeTakenSeconds / 60)} min</span>
    </div>
  </Link>
);

export const RcPage = () => {
  const query = useQuery({ queryKey: ['rc-dashboard'], queryFn: () => api<{ dashboard: Dashboard }>('/api/v1/rc') });
  if (query.isLoading) return <Skeleton className="h-[620px]" />;
  const data = query.data?.dashboard;
  if (!data) return <EmptyState icon={BookOpenText} title="RC is unavailable" description="Please try again after a moment." />;

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-3xl bg-moss-800 text-white shadow-card">
        <div className="grid gap-6 p-7 lg:grid-cols-[1fr_360px]">
          <div>
            <Badge className="bg-white/12 text-lime">Reading Comprehension</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Daily RC practice</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">Build reading speed, accuracy and consistency through passage-first practice.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">🔥 {data.myLeaderboard?.currentStreak ?? 0}</p><p className="text-xs text-moss-100/70">active streak</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{data.myLeaderboard?.highestStreak ?? 0}</p><p className="text-xs text-moss-100/70">best streak</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{data.myLeaderboard?.totalRcAttempted ?? 0}</p><p className="text-xs text-moss-100/70">attempted</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{data.myLeaderboard?.averageScore ?? 0}</p><p className="text-xs text-moss-100/70">average score</p></div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Active RC tests</h2><Link to="/student/rc/tests" className="text-sm font-semibold text-moss-700">All tests</Link></div>
          <div className="grid gap-3 md:grid-cols-2">{data.activeTests.length ? data.activeTests.map((test) => <TestCard key={test.id} test={test} />) : <EmptyState compact icon={BookOpenText} title="No active RC today" description="Scheduled RC tests will appear here." />}</div>
        </Card>
        <Card className="hidden p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Leaderboard</h2><Medal size={19} className="text-amber" /></div>
          <div className="space-y-3">
            {data.leaderboard.map((entry) => (
              <div key={entry.studentId} className={cn('flex items-center gap-3 rounded-2xl border p-3', entry.isCurrentStudent ? 'border-lime bg-lime/15' : 'border-stone-200 bg-white')}>
                <span className={cn('grid size-9 place-items-center rounded-xl text-sm font-bold', entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' : entry.rank === 2 ? 'bg-slate-100 text-slate-600' : entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-moss-100 text-moss-800')}>
                  {entry.rank <= 3 ? <Trophy size={17} /> : `#${entry.rank}`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{entry.student.name}</p>
                  <p className="text-xs text-stone-500">{entry.currentStreak} streak · {entry.averageScore} avg</p>
                </div>
                <p className="text-xs font-semibold text-stone-500">Best {entry.highestStreak}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-5">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Recent attempts</h2><Link to="/student/rc/attempts" className="text-sm font-semibold text-moss-700">Show all</Link></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.recentAttempts.length ? data.recentAttempts.map((attempt) => <AttemptCard key={attempt.id} attempt={attempt} />) : <EmptyState compact icon={ListChecks} title="No RC attempts yet" description="Your submitted RC attempts will appear here." />}</div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Score trend</h2>
          <div className="mt-5 h-72">
            {data.scoreTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="testTitle" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#14532d" strokeWidth={3} dot={{ r: 4 }} name="Your score" />
                  <Line type="monotone" dataKey="averageScore" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Test average" />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState compact icon={Trophy} title="No score trend yet" description="Once RC attempts exist, your score line and test average line will appear here." />}
          </div>
        </Card>
      </section>

      <LeaderboardPanel entries={data.leaderboard} />
    </div>
  );
};

const LeaderboardPanel = ({ entries }: { entries: LeaderboardEntry[] }) => (
  <section className="overflow-hidden rounded-4xl border border-[#f2e2bd] bg-[#fffaf0] shadow-card">
    <div className="relative border-b border-[#f1dfb7] bg-[#fff3d7] px-5 py-5 sm:px-7">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#201308] text-xl shadow-sm">🔥</span>
        <div>
          <p className="eyebrow text-[#9a5a06]">RC Streak Board</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#2a1a0a]">Consistency league</h2>
          <p className="mt-1 text-sm text-[#856037]">Track the students building the strongest daily reading rhythm.</p>
        </div>
      </div>
    </div>
    <div className="grid gap-3 p-5 sm:p-6">
      {entries.length ? entries.map((entry) => <LeaderboardRow key={entry.studentId} entry={entry} />) : (
        <EmptyState compact icon={Medal} title="No streaks yet" description="Submitted RC attempts will start the leaderboard." />
      )}
    </div>
  </section>
);

const LeaderboardRow = ({ entry }: { entry: LeaderboardEntry }) => (
  <div className={cn(
    'grid gap-3 rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card sm:grid-cols-[auto_1fr_auto] sm:items-center',
    entry.isCurrentStudent ? 'border-lime bg-white shadow-sm ring-2 ring-lime/40' : 'border-[#f0dfb6] bg-white/80',
  )}>
    <div className="flex items-center gap-3">
      <span className={cn('grid size-11 place-items-center rounded-2xl text-sm font-black shadow-sm', rankClass(entry.rank))}>
        {entry.rank <= 3 ? <Trophy size={18} /> : `#${entry.rank}`}
      </span>
      <div className="grid size-11 place-items-center rounded-2xl bg-moss-50 text-sm font-black text-moss-800">{initials(entry.student.name)}</div>
    </div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate font-bold text-stone-950">{entry.student.name}</p>
        {entry.isCurrentStudent && <Badge className="bg-lime/40 text-moss-900">You</Badge>}
      </div>
      <p className="mt-1 text-xs leading-5 text-stone-500">
        Avg {entry.averageScore} · {entry.totalRcAttempted} RCs attempted · Best streak {entry.highestStreak}
      </p>
      {entry.streakExpiresAt && entry.currentStreak > 0 && <p className="mt-1 text-[11px] font-semibold text-[#9a5a06]">Grace window ends {formatDateTime(entry.streakExpiresAt)}</p>}
    </div>
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fff3d7] px-4 py-3 sm:min-w-36 sm:justify-center">
      <span className="text-xl">🔥</span>
      <div>
        <p className="text-2xl font-black leading-none text-[#8a3f09]">{entry.currentStreak}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[.16em] text-[#9a7650]">active</p>
      </div>
    </div>
  </div>
);

const rankClass = (rank: number) => rank === 1
  ? 'bg-yellow-100 text-yellow-700'
  : rank === 2
    ? 'bg-slate-100 text-slate-600'
    : rank === 3
      ? 'bg-orange-100 text-orange-700'
      : 'bg-moss-100 text-moss-800';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'ST';

export const RcTestsPage = () => {
  const query = useQuery({ queryKey: ['rc-tests'], queryFn: () => api<{ tests: RcTest[] }>('/api/v1/rc/tests') });
  if (query.isLoading) return <Skeleton className="h-[520px]" />;
  const tests = query.data?.tests ?? [];
  const active = tests.filter((test) => test.phase === 'LIVE');
  const past = tests.filter((test) => test.phase === 'PAST');
  const upcoming = tests.filter((test) => test.phase === 'UPCOMING');

  return (
    <div className="space-y-6">
      <Back to="/student/rc">RC dashboard</Back>
      <div><p className="eyebrow">RC library</p><h1 className="text-3xl font-bold">All RC tests</h1></div>
      <Section title="Active tests" tests={active} />
      <Section title="Upcoming tests" tests={upcoming} />
      <Section title="Past tests" tests={past} />
    </div>
  );
};

const Section = ({ title, tests }: { title: string; tests: RcTest[] }) => (
  <Card className="p-5"><h2 className="mb-4 font-bold">{title}</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tests.length ? tests.map((test) => <TestCard key={test.id} test={test} />) : <EmptyState compact icon={BookOpenText} title={`No ${title.toLowerCase()}`} description="Nothing to show here yet." />}</div></Card>
);

export const RcTestDetailPage = () => {
  const { testId = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['rc-test', testId], queryFn: () => api<{ test: TestDetail }>(`/api/v1/rc/tests/${testId}`) });
  const startAttempt = useMutation({
    mutationFn: () => api<{ attempt: { enginePath: string } }>(`/api/v1/test-engine/rc/tests/${testId}/attempts`, { method: 'POST' }),
    onSuccess: (response) => navigate(response.attempt.enginePath),
  });
  if (query.isLoading) return <Skeleton className="h-[560px]" />;
  const test = query.data?.test;
  if (!test) return <EmptyState icon={BookOpenText} title="RC test unavailable" description="This RC test could not be opened." />;

  return (
    <div className="space-y-6">
      <Back to="/student/rc/tests">All RC tests</Back>
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <div className="flex flex-wrap gap-2"><Badge className={phaseBadge(test.phase)}>{phaseText(test.phase)}</Badge><Badge>{test.difficulty.name}</Badge></div>
          <h1 className="mt-4 text-3xl font-bold">{test.title}</h1>
          <p className="mt-3 text-sm leading-7 text-stone-700">{test.instructions}</p>
          <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-500">
            The reading passage will appear inside the RC test engine after the student starts the test.
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Test details</h2>
          <div className="mt-4 grid gap-3">
            <MiniMetric icon={BookOpenText} label="Questions" value={test.questions.length} className="bg-moss-50" />
            <MiniMetric icon={Timer} label="Duration" value={`${test.durationMinutes ?? 20} min`} className="bg-sky-50" />
            <MiniMetric icon={Trophy} label="Marks" value={test.totalMarks} className="bg-lime/20" />
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">{test.instructions}</p>
          {test.attempted && test.latestAttemptId ? (
            <Link to={`/student/rc/attempts/${test.latestAttemptId}`}><Button className="mt-5 w-full">View analysis</Button></Link>
          ) : (
            <Button className="mt-5 w-full" disabled={test.phase !== 'LIVE' || startAttempt.isPending} onClick={() => startAttempt.mutate()}>
              {test.phase === 'LIVE' ? 'Start RC test' : test.phase === 'PAST' ? 'Test closed' : 'Opens later'}
            </Button>
          )}
        </Card>
      </section>
    </div>
  );
};

export const RcAttemptsPage = () => {
  const query = useQuery({ queryKey: ['rc-attempts'], queryFn: () => api<{ attempts: Attempt[] }>('/api/v1/rc/attempts') });
  if (query.isLoading) return <Skeleton className="h-[520px]" />;
  return (
    <div className="space-y-6">
      <Back to="/student/rc">RC dashboard</Back>
      <div><p className="eyebrow">RC history</p><h1 className="text-3xl font-bold">Attempted tests</h1></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data?.attempts.length ? query.data.attempts.map((attempt) => <AttemptCard key={attempt.id} attempt={attempt} />) : <EmptyState icon={ListChecks} title="No attempts yet" description="RC attempt history will appear after the engine is connected." />}</div>
    </div>
  );
};

export const RcAttemptDetailPage = () => {
  const { attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['rc-attempt', attemptId], queryFn: () => api<{ attempt: AttemptDetail }>(`/api/v1/rc/attempts/${attemptId}`) });
  if (query.isLoading) return <Skeleton className="h-[560px]" />;
  const attempt = query.data?.attempt;
  if (!attempt) return <EmptyState icon={ListChecks} title="Attempt unavailable" description="This RC attempt could not be opened." />;

  return (
    <div className="space-y-6">
      <Back to="/student/rc/attempts">Attempted tests</Back>
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <h1 className="text-3xl font-bold">{attempt.test.title}</h1>
          <p className="mt-2 text-sm text-stone-500">Submitted {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'not submitted'}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <MiniMetric icon={Trophy} label="Score" value={`${attempt.marksScored}/${attempt.totalMarks}`} className="bg-lime/20" />
            <MiniMetric icon={PlayCircle} label="Accuracy" value={`${attempt.accuracy}%`} className="bg-moss-50" />
            <MiniMetric icon={Timer} label="Time" value={`${Math.round(attempt.timeTakenSeconds / 60)} min`} className="bg-sky-50" />
            <MiniMetric icon={Flame} label="Correct" value={attempt.correctAnswers} className="bg-emerald-50" />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Question status</h2>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{ name: 'Correct', value: attempt.correctAnswers }, { name: 'Incorrect', value: attempt.incorrectAnswers }, { name: 'Unattempted', value: attempt.unattemptedAnswers }]}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area dataKey="value" stroke="#14532d" fill="#bef264" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
      <Card className="overflow-hidden p-0">
        <div className="grid gap-4 bg-gradient-to-r from-moss-900 to-moss-700 p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Badge className="bg-white/12 text-lime">Answer review</Badge>
            <h2 className="mt-3 text-2xl font-bold">Open attempted answers</h2>
            <p className="mt-1 text-sm text-moss-100/75">Detailed RC question review is separated from the analytics summary.</p>
          </div>
          <Link to={`/student/rc/attempts/${attemptId}/review`} className="inline-flex items-center justify-center rounded-2xl bg-lime px-5 py-3 text-sm font-bold text-moss-950 shadow-card hover:bg-lime/90">View attempted answers</Link>
        </div>
      </Card>
      <Card className="hidden p-5">
        <h2 className="mb-4 font-bold">Question review</h2>
        <div className="space-y-3">{attempt.answers.map((answer) => <div key={answer.id} className="rounded-2xl border border-stone-200 p-4"><Badge>{answer.status}</Badge><p className="mt-3 font-semibold">Q{answer.questionNumber}. {answer.question}</p><p className="mt-2 text-sm text-stone-600">{answer.explanation}</p><p className="mt-2 text-xs font-semibold text-moss-700">{answer.marksAwarded} marks · {answer.timeTakenSeconds}s</p></div>)}</div>
      </Card>
    </div>
  );
};

export const RcAttemptReviewPage = () => {
  const { attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['rc-attempt', attemptId], queryFn: () => api<{ attempt: AttemptDetail }>(`/api/v1/rc/attempts/${attemptId}`) });
  if (query.isLoading) return <Skeleton className="h-[560px]" />;
  const attempt = query.data?.attempt;
  if (!attempt) return <EmptyState icon={ListChecks} title="Review unavailable" description="This RC attempt could not be opened." />;

  return (
    <div className="space-y-6">
      <Back to={`/student/rc/attempts/${attemptId}`}>RC analysis</Back>
      <Card className="p-6">
        <Badge className="bg-moss-100 text-moss-800">Attempted answers</Badge>
        <h1 className="mt-4 text-3xl font-bold">{attempt.test.title}</h1>
        <p className="mt-2 text-sm text-stone-500">Submitted {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'not submitted'}</p>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">Question review</h2>
        <div className="space-y-3">{attempt.answers.map((answer) => <div key={answer.id} className="rounded-2xl border border-stone-200 p-4"><Badge>{answer.status}</Badge><p className="mt-3 font-semibold">Q{answer.questionNumber}. {answer.question}</p><p className="mt-2 text-sm text-stone-600">{answer.explanation}</p><p className="mt-2 text-xs font-semibold text-moss-700">{answer.marksAwarded} marks · {answer.timeTakenSeconds}s</p></div>)}</div>
      </Card>
    </div>
  );
};

const Back = ({ to, children }: { to: string; children: string }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700 hover:text-moss-900"><ChevronLeft size={16} /> {children}</Link>
);
