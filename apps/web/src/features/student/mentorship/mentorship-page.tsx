import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  MessageCircleQuestion,
  PlayCircle,
  Radio,
  Sparkles,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn, formatDateTime } from '../../../lib/utils';

type Phase = 'LIVE' | 'UPCOMING' | 'PAST';
type Program = { id: string; name: string; description: string; _count: { batches: number } };
type Mentor = { id: string; name: string; qualification?: string | null; profileImage?: string | null };
type Batch = {
  id: string;
  name: string;
  description: string;
  maximumStudents: number;
  mentorAssignments: { mentor: Mentor }[];
  studentAccesses: { expiryDate: string; joinedAt: string; accessSource: string }[];
  _count?: { tasks: number; liveSessions: number; tests: number };
};
type Task = {
  id: string;
  title: string;
  description: string;
  attachmentUrl?: string | null;
  startDatetime: string;
  endDatetime: string;
  phase: Phase;
  canUpdate?: boolean;
  completion?: { status: string; completedAt?: string | null } | null;
  createdBy?: Mentor;
};
type Session = {
  id: string;
  title: string;
  description: string;
  meetingLink: string;
  startDatetime: string;
  endDatetime: string;
  phase: Phase;
  attended: boolean;
  attendedAt?: string | null;
  createdBy?: Mentor;
};
type Notice = {
  id: string;
  title: string;
  description: string;
  attachmentUrl?: string | null;
  createdAt: string;
  createdByMentor?: Mentor | null;
  createdByAdmin?: { id: string; name: string } | null;
};
type TestSummary = {
  id: string;
  name: string;
  description: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes: number;
  totalMarks: number;
  difficulty: string;
  questionCount: number;
  sectionCount?: number;
  phase: Phase;
  attempted: boolean;
  latestAttemptId?: string | null;
  analytics?: { totalAttempts: number; averageScore: number; highestScore: number; averageAccuracy: number } | null;
};
type Overview = {
  id: string;
  name: string;
  description: string;
  program: { id: string; name: string };
  mentors: Mentor[];
  stats: { activeTasks: number; liveSessions: number; completedTasks: number; visibleDoubts: number; attendedSessions: number };
  tasks: Task[];
  notices: Notice[];
  liveSessions: Session[];
  tests: TestSummary[];
};
type CalendarDay = {
  date: string;
  sessionCount: number;
  attendedCount: number;
  sessions: { id: string; title: string }[];
  attendedSessions: { id: string; title: string }[];
};
type TestDetail = TestSummary & {
  instructions: string;
  canGoBackBetweenSections: boolean;
  difficulty: { name: string; description: string };
  creator?: { id: string; name: string } | null;
  sections: {
    id: string;
    name: string;
    sequenceNumber: number;
    instructions: string;
    durationMinutes?: number | null;
    totalMarks: number;
    questionCount: number;
    canGoBackToPreviousQuestion: boolean;
    analytics?: { totalAttempts: number; averageScore: number; averageAccuracy: number } | null;
  }[];
  analytics?: {
    totalAttempts: number;
    uniqueStudentsAttempted: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    averageAccuracy: number;
    averageTimeTakenSeconds: number;
    lastAttemptAt?: string | null;
  } | null;
};

const phaseLabel = (phase: Phase) => phase === 'LIVE' ? 'Live now' : phase === 'UPCOMING' ? 'Upcoming' : 'Closed';

const phaseBadgeClass = (phase: Phase) => cn(
  phase === 'LIVE' && 'bg-lime/45 text-moss-900',
  phase === 'UPCOMING' && 'bg-sky-100 text-sky-800',
  phase === 'PAST' && 'bg-stone-100 text-stone-600',
);

const groupByPhase = <T extends { phase: Phase }>(items: T[]) => ({
  live: items.filter((item) => item.phase === 'LIVE'),
  upcoming: items.filter((item) => item.phase === 'UPCOMING'),
  past: items.filter((item) => item.phase === 'PAST'),
});

const BatchBackLink = ({ to, children }: { to: string; children: string }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700 hover:text-moss-900">
    <ChevronLeft size={16} /> {children}
  </Link>
);

const BatchNav = ({ batchId, active }: { batchId: string; active: 'home' | 'tasks' | 'classes' | 'notices' | 'doubts' | 'tests' | 'analysis' }) => {
  const items = [
    { key: 'home', label: 'Home', to: `/student/mentorship/batches/${batchId}` },
    { key: 'tasks', label: 'Tasks', to: `/student/mentorship/batches/${batchId}/tasks` },
    { key: 'classes', label: 'Classes', to: `/student/mentorship/batches/${batchId}/classes` },
    { key: 'doubts', label: 'Doubts', to: `/student/mentorship/batches/${batchId}/doubts` },
    { key: 'tests', label: 'Tests', to: `/student/mentorship/batches/${batchId}/tests` },
    { key: 'notices', label: 'Notices', to: `/student/mentorship/batches/${batchId}/notices` },
    { key: 'analysis', label: 'Analysis', to: `/student/mentorship/batches/${batchId}/analysis` },
  ] as const;

  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
      {items.map((item) => (
        <Link
          key={item.key}
          to={item.to}
          className={cn(
            'whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-500 transition hover:bg-moss-50 hover:text-moss-800',
            active === item.key && 'bg-moss-800 text-white hover:bg-moss-800 hover:text-white',
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

const MentorAvatar = ({ mentor }: { mentor: Mentor }) => (
  <div className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 shadow-sm">
    <p className="text-sm font-semibold text-ink">{mentor.name}</p>
    <Badge className="bg-moss-100 text-moss-800">Mentor</Badge>
  </div>
);

const PersonBadge = ({ name, role = 'MENTOR' }: { name?: string; role?: string }) => {
  const label = role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'SUB_ADMIN' ? 'Sub Admin' : role === 'STUDENT' ? 'Student' : 'Mentor';
  const color = role === 'SUPER_ADMIN'
    ? 'bg-purple-100 text-purple-800'
    : role === 'SUB_ADMIN'
      ? 'bg-indigo-100 text-indigo-800'
      : role === 'STUDENT'
        ? 'bg-sky-100 text-sky-800'
        : 'bg-moss-100 text-moss-800';
  return <Badge className={color}>{name ? `${name} · ${label}` : label}</Badge>;
};

const EmptyPanel = ({ icon, title, description }: { icon: typeof CalendarDays; title: string; description: string }) => (
  <EmptyState compact icon={icon} title={title} description={description} />
);

const TaskRow = ({ task, onToggle, pending }: { task: Task; onToggle?: (done: boolean) => void; pending?: boolean }) => {
  const completed = task.completion?.status === 'COMPLETED';
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-moss-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{task.title}</p>
            <Badge className={phaseBadgeClass(task.phase)}>{phaseLabel(task.phase)}</Badge>
            {completed && <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>}
          </div>
          <p className="mt-1 text-sm leading-6 text-stone-600">{task.description}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-stone-500">
            <span>Starts {formatDateTime(task.startDatetime)}</span>
            <span>Ends {formatDateTime(task.endDatetime)}</span>
            {task.createdBy && <PersonBadge name={task.createdBy.name} role="MENTOR" />}
          </div>
        </div>
        {task.canUpdate && onToggle ? (
          <Button
            size="sm"
            variant={completed ? 'secondary' : 'primary'}
            disabled={pending}
            onClick={() => onToggle(!completed)}
            className="shrink-0"
          >
            <CheckCircle2 size={15} /> {completed ? 'Undo' : 'Mark complete'}
          </Button>
        ) : (
          <Badge className={task.phase === 'PAST' ? (completed ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600') : 'bg-sky-100 text-sky-800'}>
            {task.phase === 'PAST' ? (completed ? 'Completed on time' : 'Not completed') : 'Opens later'}
          </Badge>
        )}
      </div>
    </div>
  );
};

const SessionRow = ({ session, onJoin, pending }: { session: Session; onJoin?: () => void; pending?: boolean }) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-moss-200">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{session.title}</p>
          <Badge className={phaseBadgeClass(session.phase)}>{phaseLabel(session.phase)}</Badge>
          {session.attended && <Badge className="bg-emerald-100 text-emerald-800">Attendance marked</Badge>}
        </div>
        <p className="mt-1 text-sm leading-6 text-stone-600">{session.description}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-stone-500">
          <span>Starts {formatDateTime(session.startDatetime)}</span>
          <span>Ends {formatDateTime(session.endDatetime)}</span>
          {session.createdBy && <PersonBadge name={session.createdBy.name} role="MENTOR" />}
        </div>
      </div>
      {session.phase === 'LIVE' && onJoin ? (
        <div className="flex shrink-0 flex-col gap-2">
          <Button size="sm" disabled={pending} onClick={onJoin}>
            <PlayCircle size={15} /> Join class
          </Button>
          <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(session.meetingLink)}>
            Copy link
          </Button>
        </div>
      ) : (
        <Badge className={session.phase === 'PAST' ? (session.attended ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600') : phaseBadgeClass(session.phase)}>
          {session.phase === 'PAST' ? (session.attended ? 'Attended' : 'Not attended') : 'Not open yet'}
        </Badge>
      )}
    </div>
  </div>
);

const TestRow = ({ test, batchId }: { test: TestSummary; batchId: string }) => (
  <Link
    to={`/student/mentorship/batches/${batchId}/tests/${test.id}`}
    className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:-translate-y-px hover:border-moss-200 hover:shadow-card"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {test.phase === 'LIVE' && <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(34,197,94,.15)]" />}
          <p className="font-semibold text-ink">{test.name}</p>
          <Badge className={phaseBadgeClass(test.phase)}>{phaseLabel(test.phase)}</Badge>
          {test.attempted && <Badge className="bg-moss-100 text-moss-800">Attempted</Badge>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">{test.description}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-stone-500">
          <span>Ends {formatDateTime(test.endDatetime)}</span>
          <span>{test.questionCount} questions</span>
          {test.sectionCount ? <span>{test.sectionCount} sections</span> : null}
          <span>{test.totalMarks} marks</span>
          <span>{test.durationMinutes} min</span>
          <span>{test.difficulty}</span>
        </div>
        {test.phase === 'PAST' && <p className="mt-2 text-xs font-semibold text-moss-700">{test.attempted ? 'Analysis available after engine is connected' : 'Not attempted'}</p>}
      </div>
      <ArrowRight className="shrink-0 text-stone-400" size={19} />
    </div>
  </Link>
);

export const MentorshipProgramsPage = () => {
  const query = useQuery({ queryKey: ['mentor-programs'], queryFn: () => api<{ programs: Program[] }>('/api/v1/mentorship/programs') });

  if (query.isLoading) return <Skeleton className="h-72" />;
  if (!query.data?.programs.length) {
    return <EmptyState icon={GraduationCap} title="No mentorship access yet" description="Your enrolled mentorship programs will appear here." />;
  }

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">Mentorship</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your guided programs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">Structured cohorts, mentor support, live classes, doubt rooms, tasks and tests live here.</p>
      </section>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {query.data.programs.map((program, index) => (
          <Link key={program.id} to={`/student/mentorship/${program.id}`} className="group block">
            <Card className={cn('overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-card', index % 2 === 0 ? 'bg-white' : 'bg-[#fbfff3]')}>
              <div className="h-2 bg-gradient-to-r from-moss-700 via-lime to-amber" />
              <div className="p-6">
                <div className="grid size-12 place-items-center rounded-2xl bg-moss-100 text-moss-800"><GraduationCap /></div>
                <h2 className="mt-5 text-xl font-bold">{program.name}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">{program.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <Badge>{program._count.batches} available batches</Badge>
                  <span className="grid size-9 place-items-center rounded-full bg-stone-100 text-moss-800 transition group-hover:bg-moss-800 group-hover:text-white">
                    <ArrowRight size={17} />
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
};

export const MentorshipBatchesPage = () => {
  const { programId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batches', programId], queryFn: () => api<{ batches: Batch[] }>(`/api/v1/mentorship/programs/${programId}/batches`) });

  if (query.isLoading) return <Skeleton className="h-72" />;

  return (
    <div className="space-y-6">
      <div>
        <BatchBackLink to="/student/mentorship">Programs</BatchBackLink>
        <h1 className="mt-3 text-3xl font-bold">Your batches</h1>
        <p className="mt-2 text-sm text-stone-500">Only batches unlocked for your student account are shown.</p>
      </div>
      {query.data?.batches.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {query.data.batches.map((batch) => (
            <Link key={batch.id} to={`/student/mentorship/batches/${batch.id}`} className="group block">
              <Card className="overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-card">
                <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]">
                  <div>
                    <Badge className="bg-lime/40 text-moss-900">Access until {new Date(batch.studentAccesses[0]?.expiryDate).toLocaleDateString('en-IN')}</Badge>
                    <h2 className="mt-4 text-2xl font-bold">{batch.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-500">{batch.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{batch.mentorAssignments.map((item) => <MentorAvatar key={item.mentor.id} mentor={item.mentor} />)}</div>
                  </div>
                  <div className="grid min-w-32 content-between rounded-2xl bg-moss-50 p-4 text-moss-900">
                    <UsersRound size={22} />
                    <div className="mt-6 space-y-1 text-sm font-semibold">
                      <p>{batch._count?.tasks ?? 0} tasks</p>
                      <p>{batch._count?.liveSessions ?? 0} classes</p>
                      <p>{batch._count?.tests ?? 0} tests</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={UsersRound} title="No batch access found" description="Once a batch is assigned to you, it will appear here." />
      )}
    </div>
  );
};

export const MentorshipBatchPage = () => {
  const { batchId = '' } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mentor-batch', batchId], queryFn: () => api<{ batch: Overview }>(`/api/v1/mentorship/batches/${batchId}`) });
  const complete = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api(`/api/v1/mentorship/tasks/${id}/completion`, { method: 'PATCH', body: JSON.stringify({ completed: done }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mentor-batch', batchId] }),
  });
  const join = useMutation({
    mutationFn: (id: string) => api<{ session: { meetingLink: string } }>(`/api/v1/mentorship/sessions/${id}/join`, { method: 'POST' }),
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['mentor-batch', batchId] });
      window.open(data.session.meetingLink, '_blank', 'noopener,noreferrer');
    },
  });

  if (query.isLoading) return <Skeleton className="h-[560px]" />;
  const batch = query.data?.batch;
  if (!batch) return <EmptyState icon={GraduationCap} title="Batch unavailable" description="Your batch access may have expired." />;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <BatchBackLink to={`/student/mentorship/${batch.program.id}`}>{batch.program.name}</BatchBackLink>
        <section className="overflow-hidden rounded-3xl bg-moss-800 text-white shadow-card">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_360px]">
            <div>
              <Badge className="bg-white/12 text-lime">Batch workspace</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">{batch.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">{batch.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">{batch.mentors.map((mentor) => <MentorAvatar key={mentor.id} mentor={mentor} />)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{batch.stats.activeTasks}</p><p className="text-xs text-moss-100/70">active tasks</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{batch.stats.liveSessions}</p><p className="text-xs text-moss-100/70">live now</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{batch.stats.completedTasks}</p><p className="text-xs text-moss-100/70">completed</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{batch.stats.visibleDoubts}</p><p className="text-xs text-moss-100/70">doubts</p></div>
            </div>
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Link to={`/student/mentorship/batches/${batch.id}/tasks`} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card">
          <ClipboardCheck className="text-amber" /><p className="mt-4 font-bold">Tasks</p><p className="mt-1 text-sm text-stone-500">Active, upcoming and completed work.</p>
        </Link>
        <Link to={`/student/mentorship/batches/${batch.id}/classes`} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card">
          <CalendarCheck2 className="text-sky-600" /><p className="mt-4 font-bold">Live classes</p><p className="mt-1 text-sm text-stone-500">Join sessions and track attendance.</p>
        </Link>
        <Link to={`/student/mentorship/batches/${batch.id}/doubts`} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card">
          <MessageCircleQuestion className="text-indigo-600" /><p className="mt-4 font-bold">Doubts</p><p className="mt-1 text-sm text-stone-500">Ask privately or discuss publicly.</p>
        </Link>
        <Link to={`/student/mentorship/batches/${batch.id}/tests`} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card">
          <BookOpenCheck className="text-moss-700" /><p className="mt-4 font-bold">Batch tests</p><p className="mt-1 text-sm text-stone-500">Live tests, past tests and details.</p>
        </Link>
        <Link to={`/student/mentorship/batches/${batch.id}/notices`} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card">
          <FileText className="text-coral" /><p className="mt-4 font-bold">Notices</p><p className="mt-1 text-sm text-stone-500">Batch updates and attachments.</p>
        </Link>
        <Link to={`/student/mentorship/batches/${batch.id}/analysis`} className="rounded-3xl border border-stone-200 bg-[#fbfff3] p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card">
          <BarChart3 className="text-moss-700" /><p className="mt-4 font-bold">Analyze yourself</p><p className="mt-1 text-sm text-stone-500">Reserved for detailed mentor analytics.</p>
        </Link>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold">Active tasks</h2>
              <Link to={`/student/mentorship/batches/${batch.id}/tasks`} className="text-sm font-semibold text-moss-700">View all</Link>
            </div>
            <div className="space-y-3">
              {batch.tasks.length ? batch.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={{ ...task, canUpdate: true }}
                  pending={complete.isPending}
                  onToggle={(done) => complete.mutate({ id: task.id, done })}
                />
              )) : <EmptyPanel icon={ClipboardCheck} title="No active task" description="Upcoming and past tasks are organized on the tasks page." />}
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold">Latest notices</h2>
              <Link to={`/student/mentorship/batches/${batch.id}/notices`} className="text-sm font-semibold text-moss-700">Show all</Link>
            </div>
            <div className="space-y-3">
              {batch.notices.length ? batch.notices.map((notice) => (
                <div key={notice.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="font-semibold">{notice.title}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{notice.description}</p>
                  <p className="mt-2 text-xs font-medium text-stone-400">{formatDateTime(notice.createdAt)}</p>
                </div>
              )) : <EmptyPanel icon={FileText} title="No notices" description="Batch updates will appear here." />}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold">Live sessions</h2>
              <Link to={`/student/mentorship/batches/${batch.id}/classes`} className="text-sm font-semibold text-moss-700">Calendar</Link>
            </div>
            <div className="space-y-3">
              {batch.liveSessions.length ? batch.liveSessions.map((session) => (
                <SessionRow key={session.id} session={session} pending={join.isPending} onJoin={() => join.mutate(session.id)} />
              )) : <EmptyPanel icon={Radio} title="No class live now" description="Upcoming and past sessions are on the classes page." />}
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold">Live batch tests</h2>
              <Link to={`/student/mentorship/batches/${batch.id}/tests`} className="text-sm font-semibold text-moss-700">All tests</Link>
            </div>
            <div className="space-y-3">
              {batch.tests.length ? batch.tests.map((test) => <TestRow key={test.id} test={test} batchId={batch.id} />) : <EmptyPanel icon={BookOpenCheck} title="No live test" description="Upcoming and closed tests are grouped on the tests page." />}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export const MentorshipTasksPage = () => {
  const { batchId = '' } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mentor-batch-tasks', batchId], queryFn: () => api<{ tasks: Task[] }>(`/api/v1/mentorship/batches/${batchId}/tasks`) });
  const complete = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api(`/api/v1/mentorship/tasks/${id}/completion`, { method: 'PATCH', body: JSON.stringify({ completed: done }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mentor-batch-tasks', batchId] }),
  });

  if (query.isLoading) return <Skeleton className="h-[520px]" />;
  const groups = groupByPhase(query.data?.tasks ?? []);
  const completed = (query.data?.tasks ?? []).filter((task) => task.completion?.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}`}>Batch dashboard</BatchBackLink>
      <div><p className="eyebrow">Batch work</p><h1 className="text-3xl font-bold">Tasks</h1></div>
      <section className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Active tasks</h2><div className="space-y-3">{groups.live.length ? groups.live.map((task) => <TaskRow key={task.id} task={task} pending={complete.isPending} onToggle={(done) => complete.mutate({ id: task.id, done })} />) : <EmptyPanel icon={ClipboardCheck} title="Nothing active" description="Tasks open only inside their scheduled window." />}</div></Card>
          <Card className="p-5"><h2 className="mb-4 font-bold">Upcoming tasks</h2><div className="space-y-3">{groups.upcoming.length ? groups.upcoming.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={Clock3} title="No upcoming task" description="New mentor assignments will appear here." />}</div></Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Completed history</h2><div className="space-y-3">{completed.length ? completed.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={CheckCircle2} title="No completed task yet" description="Completed active tasks are saved here." />}</div></Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold">Closed tasks</h2>
              {groups.past.length > 3 && <Link to={`/student/mentorship/batches/${batchId}/tasks/closed`} className="text-sm font-semibold text-moss-700">View all</Link>}
            </div>
            <div className="space-y-3">{groups.past.length ? groups.past.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={Clock3} title="No closed task" description="Past tasks are archived here after their due date." />}</div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export const MentorshipClosedTasksPage = () => {
  const { batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batch-tasks', batchId], queryFn: () => api<{ tasks: Task[] }>(`/api/v1/mentorship/batches/${batchId}/tasks`) });

  if (query.isLoading) return <Skeleton className="h-[520px]" />;
  const closedTasks = groupByPhase(query.data?.tasks ?? []).past;

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}/tasks`}>Tasks</BatchBackLink>
      <div><p className="eyebrow">Task history</p><h1 className="text-3xl font-bold">Closed tasks</h1></div>
      <div className="space-y-3">{closedTasks.length ? closedTasks.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={Clock3} title="No closed task" description="Past tasks are archived here after their due date." />}</div>
    </div>
  );
};

export const MentorshipClassesPage = () => {
  const { batchId = '' } = useParams();
  const client = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const sessionsQuery = useQuery({ queryKey: ['mentor-batch-sessions', batchId], queryFn: () => api<{ sessions: Session[] }>(`/api/v1/mentorship/batches/${batchId}/sessions`) });
  const calendarQuery = useQuery({ queryKey: ['mentor-batch-calendar', batchId, month], queryFn: () => api<{ calendar: { month: string; days: CalendarDay[] } }>(`/api/v1/mentorship/batches/${batchId}/attendance-calendar?month=${month}`) });
  const join = useMutation({
    mutationFn: (id: string) => api<{ session: { meetingLink: string } }>(`/api/v1/mentorship/sessions/${id}/join`, { method: 'POST' }),
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['mentor-batch-sessions', batchId] });
      client.invalidateQueries({ queryKey: ['mentor-batch-calendar', batchId, month] });
      window.open(data.session.meetingLink, '_blank', 'noopener,noreferrer');
    },
  });

  if (sessionsQuery.isLoading || calendarQuery.isLoading) return <Skeleton className="h-[560px]" />;
  const groups = groupByPhase(sessionsQuery.data?.sessions ?? []);
  const days = calendarQuery.data?.calendar.days ?? [];
  const firstDay = days[0] ? new Date(`${days[0].date}T00:00:00`).getDay() : 0;

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}`}>Batch dashboard</BatchBackLink>
      <div><p className="eyebrow">Live learning</p><h1 className="text-3xl font-bold">Classes and attendance</h1></div>
      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Attendance calendar</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setMonth((value) => { const date = new Date(`${value}-01T00:00:00`); date.setMonth(date.getMonth() - 1); return date.toISOString().slice(0, 7); })}>Prev</Button>
              <Badge>{month}</Badge>
              <Button size="sm" variant="outline" onClick={() => setMonth((value) => { const date = new Date(`${value}-01T00:00:00`); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 7); })}>Next</Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-bold text-stone-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, index) => <div key={`blank-${index}`} />)}
            {days.map((day) => (
              <div
                key={day.date}
                title={day.sessionCount ? `${day.attendedCount}/${day.sessionCount} attended` : 'No live session'}
                className={cn(
                  'aspect-square rounded-2xl border p-1.5 text-left text-xs font-semibold',
                  day.sessionCount === 0 && 'border-stone-100 bg-stone-50 text-stone-300',
                  day.sessionCount > 0 && day.attendedCount === 0 && 'border-amber/40 bg-amber/10 text-[#8a620b]',
                  day.attendedCount > 0 && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                )}
              >
                <span>{Number(day.date.slice(-2))}</span>
                {day.attendedCount > 0 && <span className="mt-2 block size-2 rounded-full bg-emerald-500" />}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-stone-50 p-4">
            <h3 className="text-sm font-bold">Attendance history</h3>
            <div className="mt-3 space-y-2">
              {days.filter((day) => day.sessionCount > 0).slice(0, 6).map((day) => (
                <div key={day.date} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-stone-700">{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', day.attendedCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600')}>{day.attendedCount}/{day.sessionCount} attended</span>
                </div>
              ))}
              {!days.some((day) => day.sessionCount > 0) && <p className="text-sm text-stone-500">No sessions scheduled this month.</p>}
            </div>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Live now</h2><div className="space-y-3">{groups.live.length ? groups.live.map((session) => <SessionRow key={session.id} session={session} pending={join.isPending} onJoin={() => join.mutate(session.id)} />) : <EmptyPanel icon={Radio} title="No class live now" description="Open sessions will appear here and joining marks attendance once." />}</div></Card>
          <Card className="p-5"><h2 className="mb-4 font-bold">Upcoming</h2><div className="space-y-3">{groups.upcoming.length ? groups.upcoming.map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={CalendarDays} title="No upcoming session" description="Mentor scheduled sessions will appear here." />}</div></Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold">Past sessions</h2>
              {groups.past.length > 3 && <Link to={`/student/mentorship/batches/${batchId}/classes/past`} className="text-sm font-semibold text-moss-700">View all</Link>}
            </div>
            <div className="space-y-3">{groups.past.length ? groups.past.slice(0, 3).map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={CalendarCheck2} title="No past sessions" description="Completed sessions move here." />}</div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export const MentorshipPastClassesPage = () => {
  const { batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batch-sessions', batchId], queryFn: () => api<{ sessions: Session[] }>(`/api/v1/mentorship/batches/${batchId}/sessions`) });

  if (query.isLoading) return <Skeleton className="h-[520px]" />;
  const pastSessions = groupByPhase(query.data?.sessions ?? []).past;

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}/classes`}>Classes</BatchBackLink>
      <div><p className="eyebrow">Attendance history</p><h1 className="text-3xl font-bold">Past sessions</h1></div>
      <div className="space-y-3">{pastSessions.length ? pastSessions.map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={CalendarCheck2} title="No past sessions" description="Completed sessions move here." />}</div>
    </div>
  );
};

export const MentorshipNoticesPage = () => {
  const { batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batch-notices', batchId], queryFn: () => api<{ notices: Notice[] }>(`/api/v1/mentorship/batches/${batchId}/notices?take=50`) });

  if (query.isLoading) return <Skeleton className="h-[420px]" />;

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}`}>Batch dashboard</BatchBackLink>
      <div><p className="eyebrow">Batch updates</p><h1 className="text-3xl font-bold">Notices</h1></div>
      <div className="space-y-4">
        {query.data?.notices.length ? query.data.notices.map((notice) => (
          <Card key={notice.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{notice.title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">{notice.description}</p>
              </div>
              <Badge>{formatDateTime(notice.createdAt)}</Badge>
            </div>
            {notice.attachmentUrl && <a href={notice.attachmentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-moss-700"><ExternalLink size={15} /> Attachment</a>}
          </Card>
        )) : <EmptyState icon={FileText} title="No notices yet" description="Batch announcements and resources will be posted here." />}
      </div>
    </div>
  );
};

export const MentorshipTestsPage = () => {
  const { batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batch-tests', batchId], queryFn: () => api<{ tests: TestSummary[] }>(`/api/v1/mentorship/batches/${batchId}/tests`) });

  if (query.isLoading) return <Skeleton className="h-[520px]" />;
  const groups = groupByPhase(query.data?.tests ?? []);

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}`}>Batch dashboard</BatchBackLink>
      <div><p className="eyebrow">Mentor assessments</p><h1 className="text-3xl font-bold">Batch tests</h1></div>
      <section className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Live tests</h2><div className="space-y-3">{groups.live.length ? groups.live.map((test) => <TestRow key={test.id} test={test} batchId={batchId} />) : <EmptyPanel icon={BookOpenCheck} title="No live test" description="Tests can be attempted only inside their active window." />}</div></Card>
          <Card className="p-5"><h2 className="mb-4 font-bold">Upcoming tests</h2><div className="space-y-3">{groups.upcoming.length ? groups.upcoming.map((test) => <TestRow key={test.id} test={test} batchId={batchId} />) : <EmptyPanel icon={Clock3} title="No upcoming test" description="Scheduled tests will appear here." />}</div></Card>
        </div>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold">Closed tests</h2>
            {groups.past.length > 3 && <Link to={`/student/mentorship/batches/${batchId}/tests/closed`} className="text-sm font-semibold text-moss-700">View all</Link>}
          </div>
          <div className="space-y-3">{groups.past.length ? groups.past.slice(0, 3).map((test) => <TestRow key={test.id} test={test} batchId={batchId} />) : <EmptyPanel icon={Trophy} title="No closed test" description="Past tests and analysis links will live here." />}</div>
        </Card>
      </section>
    </div>
  );
};

export const MentorshipClosedTestsPage = () => {
  const { batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batch-tests', batchId], queryFn: () => api<{ tests: TestSummary[] }>(`/api/v1/mentorship/batches/${batchId}/tests`) });

  if (query.isLoading) return <Skeleton className="h-[520px]" />;
  const closedTests = groupByPhase(query.data?.tests ?? []).past;

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}/tests`}>Batch tests</BatchBackLink>
      <div><p className="eyebrow">Test history</p><h1 className="text-3xl font-bold">Closed tests</h1></div>
      <div className="space-y-3">{closedTests.length ? closedTests.map((test) => <TestRow key={test.id} test={test} batchId={batchId} />) : <EmptyPanel icon={Trophy} title="No closed test" description="Past tests and analysis links will live here." />}</div>
    </div>
  );
};

export const MentorshipTestDetailPage = () => {
  const { batchId = '', testId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batch-test', batchId, testId], queryFn: () => api<{ test: TestDetail }>(`/api/v1/mentorship/batches/${batchId}/tests/${testId}`) });

  if (query.isLoading) return <Skeleton className="h-[560px]" />;
  const test = query.data?.test;
  if (!test) return <EmptyState icon={BookOpenCheck} title="Test unavailable" description="This batch test could not be opened." />;

  const attemptText = test.attempted ? 'View analysis' : test.phase === 'LIVE' ? 'Attempt when engine is ready' : test.phase === 'PAST' ? 'Test closed' : 'Opens later';

  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}/tests`}>Batch tests</BatchBackLink>
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2"><Badge className={phaseBadgeClass(test.phase)}>{phaseLabel(test.phase)}</Badge><Badge>{test.difficulty.name}</Badge></div>
          <h1 className="mt-4 text-3xl font-bold">{test.name}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{test.description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-moss-50 p-4"><p className="text-xl font-bold">{test.questionCount}</p><p className="text-xs text-stone-500">questions</p></div>
            <div className="rounded-2xl bg-lime/20 p-4"><p className="text-xl font-bold">{test.totalMarks}</p><p className="text-xs text-stone-500">marks</p></div>
            <div className="rounded-2xl bg-sky-50 p-4"><p className="text-xl font-bold">{test.durationMinutes}</p><p className="text-xs text-stone-500">minutes</p></div>
            <div className="rounded-2xl bg-amber/15 p-4"><p className="text-xl font-bold">{test.sections.length}</p><p className="text-xs text-stone-500">sections</p></div>
          </div>
          <div className="mt-6">
            <h2 className="font-bold">Instructions</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-600">{test.instructions}</p>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Schedule</h2>
          <div className="mt-4 space-y-3 text-sm text-stone-600">
            <p><span className="font-semibold text-ink">Starts:</span> {formatDateTime(test.startDatetime)}</p>
            <p><span className="font-semibold text-ink">Ends:</span> {formatDateTime(test.endDatetime)}</p>
            <p><span className="font-semibold text-ink">Back between sections:</span> {test.canGoBackBetweenSections ? 'Allowed' : 'Not allowed'}</p>
          </div>
          <Button className="mt-5 w-full" disabled={!test.attempted}>{attemptText}</Button>
          {test.analytics && (
            <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm">
              <p className="font-bold">Batch analytics</p>
              <p className="mt-2 text-stone-600">Average score: {test.analytics.averageScore}</p>
              <p className="text-stone-600">Highest score: {test.analytics.highestScore}</p>
              <p className="text-stone-600">Attempts: {test.analytics.totalAttempts}</p>
            </div>
          )}
        </Card>
      </section>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">Sections</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {test.sections.map((section) => (
            <div key={section.id} className="rounded-2xl border border-stone-200 p-4">
              <p className="font-semibold">{section.sequenceNumber}. {section.name}</p>
              <p className="mt-1 text-sm text-stone-500">{section.questionCount} questions · {section.totalMarks} marks · {section.durationMinutes ?? test.durationMinutes} min</p>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-stone-500">{section.instructions}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export const MentorshipAnalysisPage = () => {
  const { batchId = '' } = useParams();
  return (
    <div className="space-y-6">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}`}>Batch dashboard</BatchBackLink>
      <Card className="overflow-hidden p-0">
        <div className="grid gap-6 bg-moss-800 p-7 text-white lg:grid-cols-[1fr_280px]">
          <div>
            <Badge className="bg-white/12 text-lime">Coming next</Badge>
            <h1 className="mt-4 text-3xl font-semibold">Analyze yourself</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">This page is reserved for the detailed mentorship analytics you said you will define later: topic strength, subtopic trends, test consistency and mentor batch comparisons.</p>
          </div>
          <div className="grid place-items-center rounded-3xl bg-white/10">
            <Sparkles size={42} className="text-lime" />
          </div>
        </div>
      </Card>
    </div>
  );
};
