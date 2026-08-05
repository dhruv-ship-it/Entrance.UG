import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  MessageCircleQuestion,
  PlayCircle,
  Radio,
  Target,
  Sparkles,
  Trophy,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  latestAttemptStatus?: string | null;
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
type BatchAnalysis = {
  attempt: { id: string; submittedAt: string | null; timeTakenSeconds: number; totalMarks: number; marksScored: number; percentage: number; accuracy: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number };
  test: {
    id: string;
    batchId: string;
    batchName: string;
    name: string;
    totalMarks: number;
    analytics: ({ totalAttempts: number; uniqueStudentsAttempted: number; averageScore: number; highestScore: number; lowestScore: number; averageAccuracy: number; averageTimeTakenSeconds: number }) | null;
    marksDistribution: { label: string; count: number }[];
    sections: { id: string; name: string; analytics: SectionAnalytics | null }[];
  };
  sections: { id: string; name: string; totalMarks: number; marksScored: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; accuracy: number; timeTakenSeconds: number; analytics: SectionAnalytics | null }[];
  filters: { sections: { id: string; name: string }[]; difficulties: { id: string; name: string }[] };
  answers: BatchAnswer[];
};
type SectionAnalytics = { totalAttempts: number; averageScore: number; highestScore: number; lowestScore: number; averageAccuracy: number; averageTimeTakenSeconds: number; totalCorrectAnswers: number; totalIncorrectAnswers: number; totalUnattemptedAnswers: number };
type BatchAnswer = { id: string; sectionId: string; sectionName: string; question: string; options: unknown; selectedAnswers: unknown; correctAnswers: unknown; status: 'CORRECT' | 'INCORRECT' | 'PARTIALLY_CORRECT' | 'UNATTEMPTED'; marksAwarded: number; positiveMarks: number; negativeMarks: number; timeTakenSeconds: number; averageTimeTakenSeconds: number; bookmarked: boolean; explanation: string; imageUrl: string | null; comprehension: { title: string | null; passage: string } | null; difficulty: { id: string; name: string }; topic: { id: string; name: string; subject?: { id: string; name: string } }; subtopic: { id: string; name: string } };

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
        {test.phase === 'PAST' && <p className="mt-2 text-xs font-semibold text-moss-700">{test.latestAttemptStatus === 'SUBMITTED' || test.latestAttemptStatus === 'AUTO_SUBMITTED' ? 'Analysis available' : 'Not attempted'}</p>}
        {test.latestAttemptStatus === 'IN_PROGRESS' && <p className="mt-2 text-xs font-semibold text-amber-700">Attempt in progress</p>}
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
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mentor-batch-test', batchId, testId], queryFn: () => api<{ test: TestDetail }>(`/api/v1/mentorship/batches/${batchId}/tests/${testId}`) });
  const startAttempt = useMutation({
    mutationFn: () => api<{ attempt: { id: string; enginePath: string } }>(`/api/v1/test-engine/batch/tests/${testId}/attempts`, { method: 'POST' }),
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['mentor-batch-test', batchId, testId] });
      client.invalidateQueries({ queryKey: ['mentor-batch-tests', batchId] });
      navigate(data.attempt.enginePath);
    },
  });

  if (query.isLoading) return <Skeleton className="h-[560px]" />;
  const test = query.data?.test;
  if (!test) return <EmptyState icon={BookOpenCheck} title="Test unavailable" description="This batch test could not be opened." />;

  const isSubmitted = test.latestAttemptStatus === 'SUBMITTED' || test.latestAttemptStatus === 'AUTO_SUBMITTED';
  const isInProgress = test.latestAttemptStatus === 'IN_PROGRESS';
  const attemptText = isSubmitted ? 'View analysis' : isInProgress ? 'Resume test' : test.phase === 'LIVE' ? 'Start test' : test.phase === 'PAST' ? 'Test closed' : 'Opens later';

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
          {isSubmitted && test.latestAttemptId ? (
            <Button className="mt-5 w-full" onClick={() => navigate(`/student/mentorship/batches/${batchId}/tests/attempts/${test.latestAttemptId}/analysis`)}><BarChart3 size={16} />{attemptText}</Button>
          ) : isInProgress && test.latestAttemptId ? (
            <Button className="mt-5 w-full" onClick={() => navigate(`/student/test-engine/batch/${test.latestAttemptId}`)}><PlayCircle size={16} />{attemptText}</Button>
          ) : (
            <Button className="mt-5 w-full" disabled={test.phase !== 'LIVE' || startAttempt.isPending} onClick={() => startAttempt.mutate()}><PlayCircle size={16} />{attemptText}</Button>
          )}
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

export const MentorshipTestAttemptAnalysisPage = () => {
  const { batchId = '', attemptId = '' } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mentor-batch-test-analysis', attemptId], queryFn: () => api<{ analysis: BatchAnalysis }>(`/api/v1/mentorship/test-attempts/${attemptId}/analysis`).then((response) => response.analysis) });
  const [sectionId, setSectionId] = useState('all');
  const [difficultyId, setDifficultyId] = useState('all');
  const [status, setStatus] = useState('all');
  const bookmark = useMutation({
    mutationFn: ({ id, bookmarked }: { id: string; bookmarked: boolean }) => api(`/api/v1/mentorship/test-attempt-answers/${id}/bookmark`, { method: 'PATCH', body: JSON.stringify({ bookmarked }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mentor-batch-test-analysis', attemptId] }),
  });

  const analysis = query.data;
  const chartAnalytics = sectionId === 'all' ? analysis?.test.analytics : analysis?.test.sections.find((section) => section.id === sectionId)?.analytics;
  const answerTotals = sectionId === 'all' && analysis
    ? aggregateSectionAnalytics(analysis.test.sections.map((section) => section.analytics).filter(Boolean) as SectionAnalytics[])
    : analysis?.test.sections.find((section) => section.id === sectionId)?.analytics;
  const filteredAnswers = (analysis?.answers ?? []).filter((answer) => {
    if (sectionId !== 'all' && answer.sectionId !== sectionId) return false;
    if (difficultyId !== 'all' && answer.difficulty.id !== difficultyId) return false;
    if (status !== 'all' && answer.status !== status) return false;
    return true;
  });
  const filteredSummary = summarizeBatchAnswers(filteredAnswers);
  const answerMix = answerTotals ? [
    { name: 'Correct', value: answerTotals.totalCorrectAnswers, percent: percentOfAnswers(answerTotals.totalCorrectAnswers, answerTotals), color: '#166534' },
    { name: 'Incorrect', value: answerTotals.totalIncorrectAnswers, percent: percentOfAnswers(answerTotals.totalIncorrectAnswers, answerTotals), color: '#dc2626' },
    { name: 'Unattempted', value: answerTotals.totalUnattemptedAnswers, percent: percentOfAnswers(answerTotals.totalUnattemptedAnswers, answerTotals), color: '#a8a29e' },
  ] : [];

  if (query.isLoading) return <Skeleton className="h-[720px]" />;
  if (!analysis) return <EmptyState icon={Trophy} title="Analysis unavailable" description="This submitted batch test attempt could not be opened." />;

  return (
    <div className="space-y-7">
      <BatchBackLink to={`/student/mentorship/batches/${batchId}/tests`}>Batch tests</BatchBackLink>
      <section className="rounded-3xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">Batch test analysis</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{analysis.test.name}</h1>
        <p className="mt-2 text-sm text-moss-100/75">{analysis.test.batchName} · submitted {analysis.attempt.submittedAt ? formatDateTime(analysis.attempt.submittedAt) : 'recently'}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AnalysisMetric icon={Trophy} label="Score" value={`${analysis.attempt.marksScored}/${analysis.attempt.totalMarks}`} />
        <AnalysisMetric icon={Target} label="Percentage" value={`${analysis.attempt.percentage}%`} />
        <AnalysisMetric icon={CheckCircle2} label="Correct" value={analysis.attempt.correctAnswers} />
        <AnalysisMetric icon={XCircle} label="Incorrect" value={analysis.attempt.incorrectAnswers} />
        <AnalysisMetric icon={Clock3} label="Time" value={`${Math.floor(analysis.attempt.timeTakenSeconds / 60)}m`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Marks distribution</h2><Badge>{sectionId === 'all' ? 'Entire test' : analysis.filters.sections.find((section) => section.id === sectionId)?.name}</Badge></div>
          <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.test.marksDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#7a9c32" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Cohort answer mix</h2><Badge>{chartAnalytics?.totalAttempts ?? 0} attempts</Badge></div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={answerMix} dataKey="percent" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={4}>{answerMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} /></PieChart></ResponsiveContainer></div>
            <div className="self-center space-y-3">{answerMix.map((entry) => <div key={entry.name} className="rounded-2xl bg-stone-50 p-3"><div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: entry.color }} /><p className="text-sm font-semibold">{entry.name}</p></div><p className="mt-1 text-2xl font-bold">{entry.percent}%</p><p className="text-xs text-stone-400">{entry.value} answers</p></div>)}</div>
          </div>
        </Card>
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={17} className="text-moss-700" />
          <select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{analysis.filters.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select>
          <select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={difficultyId} onChange={(event) => setDifficultyId(event.target.value)}><option value="all">All difficulty</option>{analysis.filters.difficulties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{['CORRECT', 'INCORRECT', 'PARTIALLY_CORRECT', 'UNATTEMPTED'].map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <AnalysisMetric compact icon={Trophy} label="Filtered score" value={filteredSummary.score} />
          <AnalysisMetric compact icon={CheckCircle2} label="Correct" value={filteredSummary.correct} />
          <AnalysisMetric compact icon={XCircle} label="Incorrect" value={filteredSummary.incorrect} />
          <AnalysisMetric compact icon={HelpCircle} label="Unattempted" value={filteredSummary.unattempted} />
        </div>
      </Card>

      <section className="space-y-4">
        {filteredAnswers.map((answer, index) => (
          <Card key={answer.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Badge className={answerStatusClass(answer.status)}>{answer.status.replace('_', ' ')}</Badge><h3 className="mt-3 font-bold">Q{index + 1}. {answer.question}</h3></div>
              <Button size="sm" variant={answer.bookmarked ? 'secondary' : 'outline'} disabled={bookmark.isPending} onClick={() => bookmark.mutate({ id: answer.id, bookmarked: !answer.bookmarked })}><Bookmark size={15} />{answer.bookmarked ? 'Bookmarked' : 'Bookmark'}</Button>
            </div>
            {answer.comprehension && <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{answer.comprehension.passage}</div>}
            {answer.imageUrl && <img src={answer.imageUrl} alt="" className="mt-4 max-h-72 rounded-2xl object-contain" />}
            <BatchOptionReview options={answer.options} selected={normalizeAnswers(answer.selectedAnswers)} correct={normalizeAnswers(answer.correctAnswers)} />
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <InfoBox label="Your answer" value={normalizeAnswers(answer.selectedAnswers).join(', ') || 'Unattempted'} />
              <InfoBox label="Correct answer" value={normalizeAnswers(answer.correctAnswers).join(', ')} />
              <InfoBox label="Marks" value={`${answer.marksAwarded} / +${answer.positiveMarks}`} />
              <InfoBox label="Time" value={`${answer.timeTakenSeconds}s · avg ${answer.averageTimeTakenSeconds}s`} />
            </div>
            <div className="mt-4 rounded-2xl bg-moss-50 p-4 text-sm leading-6 text-moss-900"><b>Explanation:</b> {answer.explanation}</div>
            <p className="mt-3 text-xs text-stone-500">{answer.sectionName} · {answer.topic.subject?.name} / {answer.topic.name} / {answer.subtopic.name} · {answer.difficulty.name}</p>
          </Card>
        ))}
      </section>
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

const AnalysisMetric = ({ icon: Icon, label, value, compact = false }: { icon: typeof Trophy; label: string; value: string | number; compact?: boolean }) => (
  <Card className={cn('p-4', compact && 'bg-stone-50 shadow-none')}>
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl bg-moss-50 text-moss-800"><Icon size={18} /></span>
      <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-stone-400">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </div>
  </Card>
);

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-400">{label}</p><p className="font-semibold text-ink">{value}</p></div>
);

const normalizeAnswers = (value: unknown) => Array.isArray(value) ? value.map(String) : [];

const percentOfAnswers = (value: number, analytics: SectionAnalytics | NonNullable<BatchAnalysis['test']['analytics']>) => {
  const total = 'totalCorrectAnswers' in analytics
    ? analytics.totalCorrectAnswers + analytics.totalIncorrectAnswers + analytics.totalUnattemptedAnswers
    : 0;
  return total ? Number(((value / total) * 100).toFixed(1)) : 0;
};

const aggregateSectionAnalytics = (sections: SectionAnalytics[]): SectionAnalytics => ({
  totalAttempts: sections.reduce((sum, section) => Math.max(sum, section.totalAttempts), 0),
  averageScore: 0,
  highestScore: 0,
  lowestScore: 0,
  averageAccuracy: 0,
  averageTimeTakenSeconds: 0,
  totalCorrectAnswers: sections.reduce((sum, section) => sum + section.totalCorrectAnswers, 0),
  totalIncorrectAnswers: sections.reduce((sum, section) => sum + section.totalIncorrectAnswers, 0),
  totalUnattemptedAnswers: sections.reduce((sum, section) => sum + section.totalUnattemptedAnswers, 0),
});

const summarizeBatchAnswers = (answers: BatchAnswer[]) => ({
  score: Number(answers.reduce((sum, answer) => sum + answer.marksAwarded, 0).toFixed(2)),
  correct: answers.filter((answer) => answer.status === 'CORRECT').length,
  incorrect: answers.filter((answer) => answer.status === 'INCORRECT' || answer.status === 'PARTIALLY_CORRECT').length,
  unattempted: answers.filter((answer) => answer.status === 'UNATTEMPTED').length,
});

const answerStatusClass = (status: string) => status === 'CORRECT' ? 'bg-moss-100 text-moss-800' : status === 'UNATTEMPTED' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-700';

const BatchOptionReview = ({ options, selected, correct }: { options: unknown; selected: string[]; correct: string[] }) => (
  <div className="mt-4 grid gap-2">
    {normalizeOptions(options).map((option) => {
      const isSelected = selected.includes(option.value);
      const isCorrect = correct.includes(option.value);
      return <div key={option.value} className={cn('rounded-2xl border p-3 text-sm', isCorrect ? 'border-moss-300 bg-moss-50' : isSelected ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-white')}><b>{option.value}.</b> {option.label}{isSelected && <span className="ml-2 text-xs font-bold">(your answer)</span>}{isCorrect && <span className="ml-2 text-xs font-bold">(correct)</span>}</div>;
    })}
  </div>
);

const normalizeOptions = (value: unknown) => Array.isArray(value)
  ? value.map((item, index) => typeof item === 'string'
    ? { value: String.fromCharCode(65 + index), label: item }
    : { value: String((item as { id?: string; value?: string }).id ?? (item as { value?: string }).value ?? String.fromCharCode(65 + index)), label: String((item as { text?: string; label?: string }).text ?? (item as { label?: string }).label ?? JSON.stringify(item)) })
  : [];
