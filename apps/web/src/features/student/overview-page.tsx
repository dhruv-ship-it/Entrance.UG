import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileBarChart2, GraduationCap, PlayCircle, ScrollText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { formatDateTime, relativeTime } from '../../lib/utils';

type Overview = {
  student: { name: string; profileImage: string | null };
  metrics: {
    mocksAttempted: number;
    averageMockAccuracy: number;
    contentCompletionPercent: number;
    completedContent: number;
    totalContent: number;
    tasksCompleted: number;
    activeBatches: number;
    unreadNotifications: number;
  };
  upcomingSessions: { id: string; title: string; startDatetime: string; endDatetime: string; batchName: string; batchId: string }[];
  recentScores: { id: string; examName: string; score: number; totalMarks: number; accuracy: number; submittedAt: string | null; href: string }[];
  activity: { id: string; type: 'MOCK' | 'CONTENT' | 'MENTORSHIP' | 'RC'; title: string; detail: string; occurredAt: string; href: string }[];
};

const metricDefinitions = [
  { key: 'mocksAttempted', label: 'Mocks attempted', icon: FileBarChart2, color: 'bg-moss-100 text-moss-800', value: (data: Overview) => data.metrics.mocksAttempted, note: 'Submitted attempts' },
  { key: 'contentCompletionPercent', label: 'Content progress', icon: BookOpen, color: 'bg-sky/15 text-[#28718d]', value: (data: Overview) => `${data.metrics.contentCompletionPercent}%`, note: (data: Overview) => `${data.metrics.completedContent} of ${data.metrics.totalContent} items` },
  { key: 'tasksCompleted', label: 'Tasks completed', icon: ClipboardCheck, color: 'bg-amber/15 text-[#9a6810]', value: (data: Overview) => data.metrics.tasksCompleted, note: 'Across mentorship batches' },
  { key: 'averageMockAccuracy', label: 'Mock accuracy', icon: CheckCircle2, color: 'bg-coral/15 text-[#b54c3a]', value: (data: Overview) => `${Math.round(data.metrics.averageMockAccuracy)}%`, note: 'From submitted mocks' },
] as const;

export const OverviewPage = () => {
  const overview = useQuery({ queryKey: ['student-overview'], queryFn: () => api<Overview>('/api/v1/students/dashboard') });
  if (overview.isLoading) return <OverviewSkeleton />;
  if (overview.isError || !overview.data) return <EmptyState icon={FileBarChart2} title="Your overview could not load" description="Please refresh the page. If this keeps happening, contact support." />;

  const data = overview.data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-4xl bg-moss-800 px-6 py-8 text-white shadow-card sm:px-8">
        <div className="absolute -right-12 -top-20 size-72 rounded-full bg-lime/15 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge className="bg-white/12 text-lime">STUDENT OVERVIEW</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{greeting}, {data.student.name.split(' ')[0]}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-moss-100/75">Your focused preparation space is ready. Small, consistent progress compounds.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricDefinitions.map((metric) => {
          const Icon = metric.icon;
          const note = typeof metric.note === 'function' ? metric.note(data) : metric.note;
          return (
            <Card key={metric.key} className="p-5">
              <div className="flex items-start justify-between">
                <div className={`grid size-11 place-items-center rounded-2xl ${metric.color}`}><Icon size={20} /></div>
                <ArrowUpRight size={17} className="text-stone-300" />
              </div>
              <p className="mt-5 text-2xl font-semibold tracking-tight">{metric.value(data)}</p>
              <p className="mt-1 text-sm font-semibold text-stone-700">{metric.label}</p>
              <p className="mt-1 text-xs text-stone-400">{note}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Momentum</p>
              <h2 className="mt-1 text-xl font-semibold">Recent activity</h2>
            </div>
            <Sparkles size={20} className="text-amber" />
          </div>
          {data.activity.length ? (
            <div className="mt-5 divide-y divide-stone-100">
              {data.activity.map((item) => (
                <Link key={item.id} to={item.href} className="flex gap-4 py-4 first:pt-0 last:pb-0 transition hover:bg-moss-50/60">
                  <ActivityIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-stone-500">{item.detail}</p>
                  </div>
                  <p className="whitespace-nowrap text-xs font-medium text-stone-400">{relativeTime(item.occurredAt)}</p>
                </Link>
              ))}
            </div>
          ) : <div className="mt-5"><EmptyState compact icon={Sparkles} title="Your journey starts here" description="Your completed mocks, content and mentorship tasks will become your progress timeline." /></div>}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-stone-100 px-6 py-5">
            <p className="eyebrow">Up next</p>
            <h2 className="mt-1 text-xl font-semibold">Live sessions</h2>
          </div>
          {data.upcomingSessions.length ? (
            <div className="divide-y divide-stone-100">
              {data.upcomingSessions.map((session) => (
                <Link key={session.id} to={`/student/mentorship/batches/${session.batchId}`} className="block px-6 py-4 transition hover:bg-moss-50/60">
                  <div className="flex gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-moss-100 text-moss-700"><CalendarDays size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold">{session.title}</p>
                      <p className="mt-1 text-xs text-stone-500">{session.batchName} · {formatDateTime(session.startDatetime)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : <div className="p-6"><EmptyState compact icon={CalendarDays} title="Nothing scheduled yet" description="Live sessions from your enrolled batches will appear here." /></div>}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Performance</p>
              <h2 className="mt-1 text-xl font-semibold">Recent mock scores</h2>
            </div>
            <FileBarChart2 size={20} className="text-moss-700" />
          </div>
          {data.recentScores.length ? (
            <div className="mt-5 space-y-4">
              {data.recentScores.map((score) => (
                <Link key={score.id} to={score.href} className="block rounded-2xl p-2 transition hover:bg-moss-50/60">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{score.examName}</span>
                    <span className="whitespace-nowrap font-semibold text-moss-800">{score.score}/{score.totalMarks}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-moss-100">
                    <div className="h-full rounded-full bg-moss-700 transition-all" style={{ width: `${Math.min(100, score.totalMarks ? (score.score / score.totalMarks) * 100 : 0)}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-stone-400">{Math.round(score.accuracy)}% accuracy</p>
                </Link>
              ))}
            </div>
          ) : <div className="mt-5"><EmptyState compact icon={PlayCircle} title="No mock attempt yet" description="Your submitted mock-test scores will be tracked here." /></div>}
        </Card>

        <Card className="flex flex-col justify-between overflow-hidden bg-[linear-gradient(130deg,#f0f6e9,#fff)] p-6 sm:p-7">
          <div>
            <Badge className="bg-lime/45 text-moss-900">A clear next step</Badge>
            <h2 className="mt-4 max-w-md text-2xl font-semibold tracking-tight">Set up your profile, then focus on the work that moves you forward.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">Your profile helps us keep your student workspace complete as you unlock materials and mentorship.</p>
          </div>
          <Link to="/student/profile" className="focus-ring mt-7 inline-flex w-fit items-center gap-2 rounded-xl bg-moss-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-moss-900">Complete profile <ArrowUpRight size={16} /></Link>
        </Card>
      </section>
    </div>
  );
};

const ActivityIcon = ({ type }: { type: Overview['activity'][number]['type'] }) => {
  const map = {
    MOCK: { icon: FileBarChart2, className: 'bg-coral/15 text-[#b54c3a]' },
    CONTENT: { icon: BookOpen, className: 'bg-sky/15 text-[#28718d]' },
    MENTORSHIP: { icon: GraduationCap, className: 'bg-amber/15 text-[#9a6810]' },
    RC: { icon: ScrollText, className: 'bg-lime/35 text-moss-800' },
  };
  const item = map[type];
  const Icon = item.icon;
  return <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.className}`}><Icon size={17} /></div>;
};

const OverviewSkeleton = () => (
  <div className="space-y-7">
    <Skeleton className="h-48 rounded-4xl" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-44" />)}</div>
    <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
  </div>
);
