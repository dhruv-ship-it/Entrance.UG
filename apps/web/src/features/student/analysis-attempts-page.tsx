import { useQuery } from '@tanstack/react-query';
import { BarChart3, BookOpenCheck, CalendarDays, CheckCircle2, ChevronLeft, ClipboardList, Clock3, HelpCircle, Search, Target, Trophy, UsersRound, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';

type AttemptBase = {
  id: string;
  submittedAt: string | null;
  timeTakenSeconds: number;
  totalMarks: number;
  marksScored: number;
  percentage: number;
  accuracy: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unattemptedAnswers: number;
};

type MockAttempt = AttemptBase & {
  rank: number | null;
  percentile: number | null;
  test: {
    id: string;
    name: string;
    examType: { id: string; name: string };
    mockExamType: { id: string; name: string };
    difficulty: { id: string; name: string };
    durationMinutes: number;
    sectionCount: number;
    questionCount: number;
  };
};

type MentorshipAttempt = AttemptBase & {
  test: {
    id: string;
    name: string;
    difficulty: { id: string; name: string };
    durationMinutes: number;
    sectionCount: number;
    questionCount: number;
    batch: { id: string; name: string };
    program: { id: string; name: string };
  };
};

export const MockAnalysisAttemptsPage = () => {
  const query = useQuery({ queryKey: ['analysis-mock-attempts'], queryFn: () => api<{ attempts: MockAttempt[] }>('/api/v1/mock-tests/attempts').then((response) => response.attempts) });
  const [search, setSearch] = useState('');
  const attempts = useMemo(() => filterAttempts(query.data ?? [], search, (attempt) => `${attempt.test.name} ${attempt.test.examType.name} ${attempt.test.mockExamType.name} ${attempt.test.difficulty.name}`), [query.data, search]);

  return (
    <AttemptsShell
      eyebrow="Mock analysis"
      title="All attempted mock tests"
      description="Every submitted mock across exam types and mock categories, with direct links to the individual analysis pages."
      icon={ClipboardList}
      tone="from-moss-900 via-moss-800 to-[#304d1f]"
      search={search}
      setSearch={setSearch}
      summary={<Summary attempts={query.data ?? []} label="mock attempts" />}
    >
      {query.isLoading ? <Skeleton className="h-96" /> : attempts.length ? (
        <div className="grid gap-4">
          {attempts.map((attempt) => (
            <AttemptCard
              key={attempt.id}
              title={attempt.test.name}
              subtitle={`${attempt.test.examType.name} · ${attempt.test.mockExamType.name}`}
              meta={[attempt.test.difficulty.name, `${attempt.test.questionCount} questions`, `${attempt.test.sectionCount} sections`, `${attempt.test.durationMinutes} min`]}
              attempt={attempt}
              extra={attempt.rank ? `Rank #${attempt.rank}${attempt.percentile ? ` · ${attempt.percentile}%ile` : ''}` : 'Rank will appear after cohort attempts'}
              to={`/student/mock-tests/attempts/${attempt.id}/analysis`}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={Trophy} title="No mock attempts found" description={search ? 'Try a different search term.' : 'Submit a mock test and it will appear here.'} />
      )}
    </AttemptsShell>
  );
};

export const MentorshipAnalysisAttemptsPage = () => {
  const query = useQuery({ queryKey: ['analysis-mentorship-attempts'], queryFn: () => api<{ attempts: MentorshipAttempt[] }>('/api/v1/mentorship/test-attempts').then((response) => response.attempts) });
  const [search, setSearch] = useState('');
  const attempts = useMemo(() => filterAttempts(query.data ?? [], search, (attempt) => `${attempt.test.name} ${attempt.test.program.name} ${attempt.test.batch.name} ${attempt.test.difficulty.name}`), [query.data, search]);

  return (
    <AttemptsShell
      eyebrow="Mentorship analysis"
      title="All attempted batch tests"
      description="Submitted tests across your mentorship programs and batches, collected in one analysis view."
      icon={UsersRound}
      tone="from-[#103f35] via-moss-800 to-[#735219]"
      search={search}
      setSearch={setSearch}
      summary={<Summary attempts={query.data ?? []} label="batch-test attempts" />}
    >
      {query.isLoading ? <Skeleton className="h-96" /> : attempts.length ? (
        <div className="grid gap-4">
          {attempts.map((attempt) => (
            <AttemptCard
              key={attempt.id}
              title={attempt.test.name}
              subtitle={`${attempt.test.program.name} · ${attempt.test.batch.name}`}
              meta={[attempt.test.difficulty.name, `${attempt.test.questionCount} questions`, `${attempt.test.sectionCount} sections`, `${attempt.test.durationMinutes} min`]}
              attempt={attempt}
              extra="Batch test analysis"
              to={`/student/mentorship/batches/${attempt.test.batch.id}/tests/attempts/${attempt.id}/analysis`}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpenCheck} title="No mentorship test attempts found" description={search ? 'Try a different search term.' : 'Submit a batch test and it will appear here.'} />
      )}
    </AttemptsShell>
  );
};

const AttemptsShell = ({ eyebrow, title, description, icon: Icon, tone, search, setSearch, summary, children }: {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  tone: string;
  search: string;
  setSearch: (value: string) => void;
  summary: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-6">
    <Link to="/student/analysis" className="inline-flex items-center gap-2 text-sm font-bold text-moss-700"><ChevronLeft size={16} />Back to analysis center</Link>
    <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${tone} p-7 text-white shadow-card`}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-lime">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-moss-100/80">{description}</p>
        </div>
        <span className="grid size-14 place-items-center rounded-3xl bg-white/12 text-lime"><Icon size={25} /></span>
      </div>
    </section>
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <Search size={18} className="text-stone-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by test, category, program, batch..." className="w-full bg-transparent text-sm outline-none" />
        </div>
      </Card>
      {summary}
    </div>
    {children}
  </div>
);

const AttemptCard = ({ title, subtitle, meta, attempt, extra, to }: { title: string; subtitle: string; meta: string[]; attempt: AttemptBase; extra: string; to: string }) => (
  <Card className="overflow-hidden p-0 transition hover:-translate-y-px hover:shadow-card">
    <div className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-moss-100 text-moss-800">{subtitle}</Badge>
          <Badge>{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'Submitted'}</Badge>
        </div>
        <h2 className="mt-3 text-xl font-black text-ink">{title}</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
          {meta.map((item) => <span key={item} className="rounded-full bg-stone-100 px-3 py-1">{item}</span>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:w-[540px]">
        <MiniMetric icon={Trophy} label="Score" value={`${attempt.marksScored}/${attempt.totalMarks}`} />
        <MiniMetric icon={Target} label="Accuracy" value={`${attempt.accuracy}%`} />
        <MiniMetric icon={CheckCircle2} label="Correct" value={attempt.correctAnswers} />
        <MiniMetric icon={XCircle} label="Incorrect" value={attempt.incorrectAnswers} />
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/80 px-5 py-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500">
        <span className="inline-flex items-center gap-1.5"><HelpCircle size={15} />{attempt.unattemptedAnswers} unattempted</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{formatDuration(attempt.timeTakenSeconds)}</span>
        <span>{extra}</span>
      </div>
      <Link to={to}>
        <Button><BarChart3 size={16} />View analysis</Button>
      </Link>
    </div>
  </Card>
);

const MiniMetric = ({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string | number }) => (
  <div className="rounded-2xl bg-moss-50 p-3">
    <div className="flex items-center gap-2 text-xs font-semibold text-moss-700"><Icon size={14} />{label}</div>
    <p className="mt-1 text-lg font-black text-moss-950">{value}</p>
  </div>
);

const Summary = ({ attempts, label }: { attempts: AttemptBase[]; label: string }) => {
  const avgScore = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length) : 0;
  const avgAccuracy = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length) : 0;
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-stone-400">Summary</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SummaryStat value={attempts.length} label={label} />
        <SummaryStat value={`${avgScore}%`} label="avg score" />
        <SummaryStat value={`${avgAccuracy}%`} label="avg accuracy" />
      </div>
    </Card>
  );
};

const SummaryStat = ({ value, label }: { value: string | number; label: string }) => (
  <div className="rounded-2xl bg-stone-50 p-3 text-center">
    <p className="text-xl font-black text-moss-900">{value}</p>
    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
  </div>
);

const filterAttempts = <T,>(attempts: T[], search: string, text: (attempt: T) => string) => {
  const needle = search.trim().toLowerCase();
  if (!needle) return attempts;
  return attempts.filter((attempt) => text(attempt).toLowerCase().includes(needle));
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
