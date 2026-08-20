import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  LockKeyhole,
  MessageCircleQuestion,
  MessageSquareReply,
  Pin,
  Radio,
  Sparkles,
  Trophy,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { cn, formatDateTime } from '../../lib/utils';

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
type Task = { id: string; title: string; description: string; attachmentUrl?: string | null; startDatetime: string; endDatetime: string; phase: Phase; completion?: { status: string; completedAt?: string | null } | null; createdBy?: Mentor };
type Session = { id: string; title: string; description: string; meetingLink: string; startDatetime: string; endDatetime: string; phase: Phase; attended: boolean; attendedAt?: string | null; createdBy?: Mentor };
type Notice = { id: string; title: string; description: string; attachmentUrl?: string | null; createdAt: string; createdByMentor?: Mentor | null; createdByAdmin?: { id: string; name: string; role: 'SUPER_ADMIN' | 'SUB_ADMIN' } | null };
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
type CalendarDay = { date: string; sessionCount: number; attendedCount: number; sessions: { id: string; title: string }[]; attendedSessions: { id: string; title: string }[] };
type TestDetail = TestSummary & {
  instructions: string;
  canGoBackBetweenSections: boolean;
  difficulty: { name: string; description: string };
  creator?: { id: string; name: string; role?: string } | null;
  sections: { id: string; name: string; sequenceNumber: number; instructions: string; durationMinutes?: number | null; totalMarks: number; questionCount: number; canGoBackToPreviousQuestion: boolean; analytics?: { totalAttempts: number; averageScore: number; averageAccuracy: number } | null }[];
  analytics?: { totalAttempts: number; uniqueStudentsAttempted: number; averageScore: number; highestScore: number; lowestScore: number; averageAccuracy: number; averageTimeTakenSeconds: number; lastAttemptAt?: string | null } | null;
};
type SectionAnalytics = { totalAttempts: number; averageScore: number; highestScore: number; lowestScore: number; averageAccuracy: number; averageTimeTakenSeconds: number; totalCorrectAnswers: number; totalIncorrectAnswers: number; totalUnattemptedAnswers: number };
type BatchAnswer = { id: string; sectionId: string; sectionName: string; question: string; options: unknown; selectedAnswers: unknown; correctAnswers: unknown; status: 'CORRECT' | 'INCORRECT' | 'PARTIALLY_CORRECT' | 'UNATTEMPTED'; marksAwarded: number; positiveMarks: number; negativeMarks: number; timeTakenSeconds: number; averageTimeTakenSeconds: number; bookmarked: boolean; explanation: string; imageUrl: string | null; comprehension: { title: string | null; passage: string } | null; difficulty: { id: string; name: string }; topic: { id: string; name: string; subject?: { id: string; name: string } }; subtopic: { id: string; name: string } };
type BatchAnalysis = {
  attempt: { id: string; submittedAt: string | null; timeTakenSeconds: number; totalMarks: number; marksScored: number; percentage: number; accuracy: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number };
  test: { id: string; batchId: string; batchName: string; name: string; totalMarks: number; analytics: ({ totalAttempts: number; uniqueStudentsAttempted: number; averageScore: number; highestScore: number; lowestScore: number; averageAccuracy: number; averageTimeTakenSeconds: number }) | null; marksDistribution: { label: string; count: number }[]; sections: { id: string; name: string; analytics: SectionAnalytics | null }[] };
  sections: { id: string; name: string; totalMarks: number; marksScored: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; accuracy: number; timeTakenSeconds: number; analytics: SectionAnalytics | null }[];
  filters: { sections: { id: string; name: string }[]; difficulties: { id: string; name: string }[] };
  answers: BatchAnswer[];
};
type DoubtStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
type Doubt = { id: string; title: string; description: string; visibility: 'PUBLIC' | 'PRIVATE'; status: DoubtStatus; isSatisfied: boolean; isPinned: boolean; createdAt: string; student: { id: string; name: string; profileImage?: string | null }; _count: { replies: number } };
type Reply = { id: string; replyText: string; isPinned: boolean; createdAt: string; student?: { id: string; name: string } | null; mentor?: { id: string; name: string } | null; admin?: { id: string; name: string; role: 'SUPER_ADMIN' | 'SUB_ADMIN' } | null; _count: { childReplies: number } };
type BatchAttemptRow = { id: string; submittedAt: string | null; totalMarks: number; marksScored: number; accuracy: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; test: { name: string; difficulty: { name: string }; questionCount: number; sectionCount: number; batch: { id: string; name: string }; program: { id: string; name: string } } };

const root = (studentId: string) => `/parent/students/${studentId}/mentorship`;
const batchRoot = (studentId: string, batchId: string) => `${root(studentId)}/batches/${batchId}`;
const phaseLabel = (phase: Phase) => phase === 'LIVE' ? 'Live now' : phase === 'UPCOMING' ? 'Upcoming' : 'Closed';
const groupByPhase = <T extends { phase: Phase }>(items: T[]) => ({ live: items.filter((item) => item.phase === 'LIVE'), upcoming: items.filter((item) => item.phase === 'UPCOMING'), past: items.filter((item) => item.phase === 'PAST') });
const phaseBadgeClass = (phase: Phase) => cn(phase === 'LIVE' && 'bg-lime/45 text-moss-900', phase === 'UPCOMING' && 'bg-sky-100 text-sky-800', phase === 'PAST' && 'bg-stone-100 text-stone-600');

export const ParentMentorshipProgramsPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-programs-rich', studentId], queryFn: () => api<{ programs: Program[] }>(`/api/v1/parents/students/${studentId}/mentorship/programs`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={GraduationCap} title="Mentorship unavailable" description="Unable to load mentorship programs." />;
  return (
    <div className="space-y-7">
      <BackLink to={`/parent/students/${studentId}`}>Student overview</BackLink>
      <section className="overflow-hidden rounded-4xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">Parent read-only mentorship</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Guided programs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">Follow the student’s mentorship ecosystem: batches, tasks, live classes, doubts, notices and batch-test performance.</p>
      </section>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {query.data.programs.length ? query.data.programs.map((program, index) => (
          <Link key={program.id} to={`${root(studentId)}/programs/${program.id}/batches`} className="group block">
            <Card className={cn('overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-card', index % 2 ? 'bg-[#fbfff3]' : 'bg-white')}>
              <div className="h-2 bg-gradient-to-r from-moss-700 via-lime to-amber" />
              <div className="p-6">
                <div className="grid size-12 place-items-center rounded-2xl bg-moss-100 text-moss-800"><GraduationCap /></div>
                <h2 className="mt-5 text-xl font-bold">{program.name}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">{program.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <Badge>{program._count.batches} linked batches</Badge>
                  <span className="grid size-9 place-items-center rounded-full bg-stone-100 text-moss-800 transition group-hover:bg-moss-800 group-hover:text-white"><ArrowRight size={17} /></span>
                </div>
              </div>
            </Card>
          </Link>
        )) : <EmptyState icon={UsersRound} title="No mentorship access" description="Linked mentorship programs will appear here." />}
      </section>
    </div>
  );
};

export const ParentMentorshipBatchesPage = () => {
  const { studentId = '', programId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-batches-rich', studentId, programId], queryFn: () => api<{ batches: Batch[] }>(`/api/v1/parents/students/${studentId}/mentorship/programs/${programId}/batches`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={UsersRound} title="Batches unavailable" description="Unable to load mentorship batches." />;
  return (
    <div className="space-y-6">
      <BackLink to={root(studentId)}>Programs</BackLink>
      <div><p className="eyebrow">Mentorship batches</p><h1 className="text-3xl font-bold tracking-tight">Linked batches</h1><p className="mt-2 text-sm text-stone-500">Counts show active/live items right now, matching the student dashboard.</p></div>
      <section className="grid gap-5 lg:grid-cols-2">
        {query.data.batches.map((batch) => (
          <Link key={batch.id} to={batchRoot(studentId, batch.id)} className="group block">
            <Card className="overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-card">
              <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]">
                <div>
                  <Badge className="bg-lime/40 text-moss-900">Access until {new Date(batch.studentAccesses[0]?.expiryDate).toLocaleDateString('en-IN')}</Badge>
                  <h2 className="mt-4 text-2xl font-bold">{batch.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-500">{batch.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{batch.mentorAssignments.map((item) => <PersonBadge key={item.mentor.id} name={item.mentor.name} role="MENTOR" />)}</div>
                </div>
                <div className="grid min-w-32 content-between rounded-2xl bg-moss-50 p-4 text-moss-900">
                  <UsersRound size={22} />
                  <div className="mt-6 space-y-1 text-sm font-semibold"><p>{batch._count?.tasks ?? 0} tasks</p><p>{batch._count?.liveSessions ?? 0} classes</p><p>{batch._count?.tests ?? 0} tests</p></div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
};

export const ParentMentorshipBatchPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-batch-rich', studentId, batchId], queryFn: () => api<{ batch: Overview }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={GraduationCap} title="Batch unavailable" description="This mentorship batch may not be linked to the student anymore." />;
  const batch = query.data.batch;
  return (
    <div className="space-y-6">
      <BackLink to={`${root(studentId)}/programs/${batch.program.id}/batches`}>{batch.program.name}</BackLink>
      <BatchHero batch={batch} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <NavCard to={`${batchRoot(studentId, batch.id)}/tasks`} icon={ClipboardCheck} title="Tasks" text="Active, upcoming and completed work." color="text-amber" />
        <NavCard to={`${batchRoot(studentId, batch.id)}/classes`} icon={CalendarCheck2} title="Live classes" text="Attendance calendar and class history." color="text-sky-600" />
        <NavCard to={`${batchRoot(studentId, batch.id)}/doubts`} icon={MessageCircleQuestion} title="Doubts" text="Private and public discussions." color="text-indigo-600" />
        <NavCard to={`${batchRoot(studentId, batch.id)}/tests`} icon={BookOpenCheck} title="Batch tests" text="Live, upcoming and closed tests." color="text-moss-700" />
        <NavCard to={`${batchRoot(studentId, batch.id)}/notices`} icon={FileText} title="Notices" text="Batch updates and attachments." color="text-coral" />
        <NavCard to={`${batchRoot(studentId, batch.id)}/analysis`} icon={BarChart3} title="Analysis" text="Submitted batch-test analysis." color="text-moss-700" highlight />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-5">
          <Card className="p-5"><ListHeader title="Active tasks" to={`${batchRoot(studentId, batch.id)}/tasks`} label="View all" /><div className="mt-4 space-y-3">{batch.tasks.length ? batch.tasks.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={ClipboardCheck} title="No active task" description="Upcoming and past tasks are organized on the tasks page." />}</div></Card>
          <Card className="p-5"><ListHeader title="Latest notices" to={`${batchRoot(studentId, batch.id)}/notices`} label="Show all" /><div className="mt-4 space-y-3">{batch.notices.length ? batch.notices.map((notice) => <NoticeCard key={notice.id} notice={notice} compact />) : <EmptyPanel icon={FileText} title="No notices" description="Batch updates will appear here." />}</div></Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5"><ListHeader title="Live sessions" to={`${batchRoot(studentId, batch.id)}/classes`} label="Calendar" /><div className="mt-4 space-y-3">{batch.liveSessions.length ? batch.liveSessions.map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={Radio} title="No class live now" description="Upcoming and past sessions are on the classes page." />}</div></Card>
          <Card className="p-5"><ListHeader title="Live batch tests" to={`${batchRoot(studentId, batch.id)}/tests`} label="All tests" /><div className="mt-4 space-y-3">{batch.tests.length ? batch.tests.map((test) => <TestRow key={test.id} test={test} studentId={studentId} batchId={batch.id} />) : <EmptyPanel icon={BookOpenCheck} title="No live test" description="Upcoming and closed tests are grouped on the tests page." />}</div></Card>
        </div>
      </section>
    </div>
  );
};

export const ParentMentorshipTasksPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-tasks', studentId, batchId], queryFn: () => api<{ tasks: Task[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/tasks`) });
  if (query.isLoading) return <PageSkeleton />;
  const groups = groupByPhase(query.data?.tasks ?? []);
  const completed = (query.data?.tasks ?? []).filter((task) => task.completion?.status === 'COMPLETED');
  return (
    <div className="space-y-6">
      <BatchBack studentId={studentId} batchId={batchId} />
      <div><p className="eyebrow">Read-only task tracking</p><h1 className="text-3xl font-bold">Tasks</h1></div>
      <section className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Active tasks</h2><div className="space-y-3">{groups.live.length ? groups.live.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={ClipboardCheck} title="Nothing active" description="Tasks open only inside their scheduled window." />}</div></Card>
          <Card className="p-5"><h2 className="mb-4 font-bold">Upcoming tasks</h2><div className="space-y-3">{groups.upcoming.length ? groups.upcoming.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={Clock3} title="No upcoming task" description="New mentor assignments will appear here." />}</div></Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Completed history</h2><div className="space-y-3">{completed.length ? completed.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={CheckCircle2} title="No completed task yet" description="Completed active tasks are saved here." />}</div></Card>
          <Card className="p-5"><ListHeader title="Closed tasks" to={`${batchRoot(studentId, batchId)}/tasks/closed`} label="View all" /><div className="mt-4 space-y-3">{groups.past.length ? groups.past.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={Clock3} title="No closed task" description="Past tasks are archived here after their due date." />}</div></Card>
        </div>
      </section>
    </div>
  );
};

export const ParentMentorshipClosedTasksPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-tasks', studentId, batchId], queryFn: () => api<{ tasks: Task[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/tasks`) });
  if (query.isLoading) return <PageSkeleton />;
  const closed = groupByPhase(query.data?.tasks ?? []).past;
  return <HistoryPage title="Closed tasks" eyebrow="Task history" backTo={`${batchRoot(studentId, batchId)}/tasks`}>{closed.length ? closed.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyPanel icon={Clock3} title="No closed task" description="Past tasks are archived here." />}</HistoryPage>;
};

export const ParentMentorshipClassesPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const sessionsQuery = useQuery({ queryKey: ['parent-mentor-sessions', studentId, batchId], queryFn: () => api<{ sessions: Session[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/sessions`) });
  const calendarQuery = useQuery({ queryKey: ['parent-mentor-calendar', studentId, batchId, month], queryFn: () => api<{ calendar: { month: string; days: CalendarDay[] } }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/attendance-calendar?month=${month}`) });
  if (sessionsQuery.isLoading || calendarQuery.isLoading) return <PageSkeleton />;
  const groups = groupByPhase(sessionsQuery.data?.sessions ?? []);
  const days = calendarQuery.data?.calendar.days ?? [];
  const firstDay = days[0] ? new Date(`${days[0].date}T00:00:00`).getDay() : 0;
  return (
    <div className="space-y-6">
      <BatchBack studentId={studentId} batchId={batchId} />
      <div><p className="eyebrow">Classes and attendance</p><h1 className="text-3xl font-bold">Live classes</h1></div>
      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Attendance calendar</h2><MonthControls month={month} setMonth={setMonth} /></div>
          <CalendarGrid days={days} firstDay={firstDay} />
          <AttendanceHistory days={days} />
        </Card>
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Live now</h2><div className="space-y-3">{groups.live.length ? groups.live.map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={Radio} title="No class live now" description="Open sessions will appear here." />}</div></Card>
          <Card className="p-5"><h2 className="mb-4 font-bold">Upcoming</h2><div className="space-y-3">{groups.upcoming.length ? groups.upcoming.map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={CalendarDays} title="No upcoming session" description="Mentor scheduled sessions will appear here." />}</div></Card>
          <Card className="p-5"><ListHeader title="Past sessions" to={`${batchRoot(studentId, batchId)}/classes/past`} label="View all" /><div className="mt-4 space-y-3">{groups.past.length ? groups.past.slice(0, 3).map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={CalendarCheck2} title="No past sessions" description="Completed sessions move here." />}</div></Card>
        </div>
      </section>
    </div>
  );
};

export const ParentMentorshipPastClassesPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-sessions', studentId, batchId], queryFn: () => api<{ sessions: Session[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/sessions`) });
  if (query.isLoading) return <PageSkeleton />;
  const past = groupByPhase(query.data?.sessions ?? []).past;
  return <HistoryPage title="Past sessions" eyebrow="Attendance history" backTo={`${batchRoot(studentId, batchId)}/classes`}>{past.length ? past.map((session) => <SessionRow key={session.id} session={session} />) : <EmptyPanel icon={CalendarCheck2} title="No past sessions" description="Completed sessions move here." />}</HistoryPage>;
};

export const ParentMentorshipNoticesPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-notices', studentId, batchId], queryFn: () => api<{ notices: Notice[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/notices?take=50`) });
  if (query.isLoading) return <PageSkeleton />;
  return (
    <div className="space-y-6">
      <BatchBack studentId={studentId} batchId={batchId} />
      <div><p className="eyebrow">Batch updates</p><h1 className="text-3xl font-bold">Notices</h1></div>
      <div className="space-y-4">{query.data?.notices.length ? query.data.notices.map((notice) => <NoticeCard key={notice.id} notice={notice} />) : <EmptyState icon={FileText} title="No notices yet" description="Batch announcements and resources will be posted here." />}</div>
    </div>
  );
};

export const ParentMentorshipTestsPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-tests', studentId, batchId], queryFn: () => api<{ tests: TestSummary[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/tests`) });
  if (query.isLoading) return <PageSkeleton />;
  const groups = groupByPhase(query.data?.tests ?? []);
  return (
    <div className="space-y-6">
      <BatchBack studentId={studentId} batchId={batchId} />
      <div><p className="eyebrow">Mentor assessments</p><h1 className="text-3xl font-bold">Batch tests</h1></div>
      <section className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
        <div className="space-y-5">
          <Card className="p-5"><h2 className="mb-4 font-bold">Live tests</h2><div className="space-y-3">{groups.live.length ? groups.live.map((test) => <TestRow key={test.id} test={test} studentId={studentId} batchId={batchId} />) : <EmptyPanel icon={BookOpenCheck} title="No live test" description="Tests can be attempted only inside their active window." />}</div></Card>
          <Card className="p-5"><h2 className="mb-4 font-bold">Upcoming tests</h2><div className="space-y-3">{groups.upcoming.length ? groups.upcoming.map((test) => <TestRow key={test.id} test={test} studentId={studentId} batchId={batchId} />) : <EmptyPanel icon={Clock3} title="No upcoming test" description="Scheduled tests will appear here." />}</div></Card>
        </div>
        <Card className="p-5"><ListHeader title="Closed tests" to={`${batchRoot(studentId, batchId)}/tests/closed`} label="View all" /><div className="mt-4 space-y-3">{groups.past.length ? groups.past.slice(0, 3).map((test) => <TestRow key={test.id} test={test} studentId={studentId} batchId={batchId} />) : <EmptyPanel icon={Trophy} title="No closed test" description="Past tests and analysis links will live here." />}</div></Card>
      </section>
    </div>
  );
};

export const ParentMentorshipClosedTestsPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-tests', studentId, batchId], queryFn: () => api<{ tests: TestSummary[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/tests`) });
  if (query.isLoading) return <PageSkeleton />;
  const closed = groupByPhase(query.data?.tests ?? []).past;
  return <HistoryPage title="Closed tests" eyebrow="Test history" backTo={`${batchRoot(studentId, batchId)}/tests`}>{closed.length ? closed.map((test) => <TestRow key={test.id} test={test} studentId={studentId} batchId={batchId} />) : <EmptyPanel icon={Trophy} title="No closed test" description="Past tests and analysis links will live here." />}</HistoryPage>;
};

export const ParentMentorshipTestDetailPage = () => {
  const { studentId = '', batchId = '', testId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-test-detail', studentId, batchId, testId], queryFn: () => api<{ test: TestDetail }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/tests/${testId}`) });
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data?.test) return <EmptyState icon={BookOpenCheck} title="Test unavailable" description="Unable to open this batch test." />;
  const test = query.data.test;
  return (
    <div className="space-y-6">
      <BackLink to={`${batchRoot(studentId, batchId)}/tests`}>Batch tests</BackLink>
      <section className="rounded-4xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">Read-only test details</Badge>
        <h1 className="mt-4 text-3xl font-semibold">{test.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">{test.description}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-5"><HeroStat label="questions" value={test.questionCount} /><HeroStat label="marks" value={test.totalMarks} /><HeroStat label="duration" value={`${test.durationMinutes}m`} /><HeroStat label="sections" value={test.sections.length} /><HeroStat label="difficulty" value={test.difficulty.name} /></div>
      </section>
      <section className="grid gap-5 xl:grid-cols-[1fr_.65fr]">
        <Card className="p-5"><h2 className="font-bold">Sections</h2><div className="mt-4 space-y-3">{test.sections.map((section) => <div key={section.id} className="rounded-2xl border border-stone-100 p-4"><div className="flex flex-wrap justify-between gap-3"><p className="font-semibold">{section.name}</p><Badge>{section.questionCount} questions</Badge></div><p className="mt-2 text-sm text-stone-500">{section.totalMarks} marks{section.durationMinutes ? ` · ${section.durationMinutes} min` : ''}</p>{section.analytics && <p className="mt-2 text-xs text-stone-400">Avg {section.analytics.averageScore} · {Math.round(section.analytics.averageAccuracy)}% accuracy</p>}</div>)}</div></Card>
        <Card className="p-5"><h2 className="font-bold">Status</h2><div className="mt-4 space-y-3"><InfoBox label="Window" value={`${formatDateTime(test.startDatetime)} — ${formatDateTime(test.endDatetime)}`} /><InfoBox label="Attempt status" value={test.attempted ? 'Attempted' : phaseLabel(test.phase)} />{test.analytics && <InfoBox label="Cohort" value={`${test.analytics.totalAttempts} attempts · avg ${test.analytics.averageScore}`} />}{test.latestAttemptId && <Link className="inline-flex w-full items-center justify-center rounded-2xl bg-moss-800 px-4 py-3 text-sm font-bold text-white" to={`${batchRoot(studentId, batchId)}/tests/attempts/${test.latestAttemptId}/analysis`}>Open analysis</Link>}</div></Card>
      </section>
      {test.instructions && <Card className="p-5"><h2 className="font-bold">Instructions</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{test.instructions}</p></Card>}
    </div>
  );
};

export const ParentMentorshipAttemptAnalysisPage = () => {
  const { studentId = '', batchId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-attempt-analysis-rich', studentId, attemptId], queryFn: () => api<{ analysis: BatchAnalysis }>(`/api/v1/parents/students/${studentId}/mentorship/batch-attempts/${attemptId}`).then((response) => response.analysis) });
  const [sectionId, setSectionId] = useState('all');
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data) return <EmptyState icon={Trophy} title="Analysis unavailable" description="This submitted batch test attempt could not be opened." />;
  const analysis = query.data;
  const chartAnalytics = sectionId === 'all' ? aggregateSectionAnalytics(analysis.test.sections.map((section) => section.analytics).filter(Boolean) as SectionAnalytics[]) : analysis.test.sections.find((section) => section.id === sectionId)?.analytics;
  const answerMix = chartAnalytics ? [
    { name: 'Correct', value: chartAnalytics.totalCorrectAnswers, percent: percentOfAnswers(chartAnalytics.totalCorrectAnswers, chartAnalytics), color: '#2f8f46' },
    { name: 'Incorrect', value: chartAnalytics.totalIncorrectAnswers, percent: percentOfAnswers(chartAnalytics.totalIncorrectAnswers, chartAnalytics), color: '#ef4444' },
    { name: 'Unattempted', value: chartAnalytics.totalUnattemptedAnswers, percent: percentOfAnswers(chartAnalytics.totalUnattemptedAnswers, chartAnalytics), color: '#a8a29e' },
  ] : [];
  return (
    <div className="space-y-7">
      <BackLink to={`${batchRoot(studentId, batchId || analysis.test.batchId)}/tests`}>Batch tests</BackLink>
      <section className="rounded-4xl bg-moss-800 p-7 text-white shadow-card">
        <Badge className="bg-white/12 text-lime">Parent read-only analysis</Badge>
        <h1 className="mt-4 text-3xl font-semibold">{analysis.test.name}</h1>
        <p className="mt-2 text-sm text-moss-100/75">{analysis.test.batchName} · submitted {analysis.attempt.submittedAt ? formatDateTime(analysis.attempt.submittedAt) : 'recently'}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-5"><HeroStat label="score" value={`${analysis.attempt.marksScored}/${analysis.attempt.totalMarks}`} /><HeroStat label="accuracy" value={`${Math.round(analysis.attempt.accuracy)}%`} /><HeroStat label="correct" value={analysis.attempt.correctAnswers} /><HeroStat label="incorrect" value={analysis.attempt.incorrectAnswers} /><HeroStat label="unattempted" value={analysis.attempt.unattemptedAnswers} /></div>
      </section>
      <Card className="p-5"><div className="flex flex-wrap items-center gap-3"><Filter size={17} className="text-moss-700" /><span className="text-sm font-semibold text-stone-600">Chart scope</span><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{analysis.filters.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></div></Card>
      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Marks distribution</h2><Badge>{sectionId === 'all' ? 'Entire test' : analysis.filters.sections.find((section) => section.id === sectionId)?.name}</Badge></div><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.test.marksDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#7a9c32" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Cohort answer mix</h2><Badge>{chartAnalytics?.totalAttempts ?? 0} attempts</Badge></div><div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={answerMix} dataKey="percent" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={4}>{answerMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} /></PieChart></ResponsiveContainer></div><div className="self-center space-y-3">{answerMix.map((entry) => <div key={entry.name} className="rounded-2xl bg-stone-50 p-3"><div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: entry.color }} /><p className="text-sm font-semibold">{entry.name}</p></div><p className="mt-1 text-2xl font-bold">{entry.percent}%</p><p className="text-xs text-stone-400">{entry.value} answers</p></div>)}</div></div></Card>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5"><h2 className="font-bold">Section performance</h2><div className="mt-4 space-y-3">{analysis.sections.map((section) => <div key={section.id} className="rounded-2xl border border-stone-100 p-4"><div className="flex justify-between gap-3"><p className="font-semibold">{section.name}</p><Badge>{section.marksScored}/{section.totalMarks}</Badge></div><p className="mt-2 text-sm text-stone-500">{Math.round(section.accuracy)}% accuracy · {section.correctAnswers}C/{section.incorrectAnswers}W/{section.unattemptedAnswers}U</p></div>)}</div></Card>
        <Card className="overflow-hidden p-0"><div className="grid gap-4 bg-gradient-to-r from-moss-900 to-moss-700 p-6 text-white md:grid-cols-[1fr_auto] md:items-center"><div><Badge className="bg-white/12 text-lime">Answer review</Badge><h2 className="mt-3 text-2xl font-bold">Open attempted answers</h2><p className="mt-1 text-sm text-moss-100/75">Detailed question review, filters, explanations and bookmarks are on a separate page.</p></div><Link to={`${batchRoot(studentId, batchId || analysis.test.batchId)}/tests/attempts/${attemptId}/review`} className="inline-flex items-center justify-center rounded-2xl bg-lime px-5 py-3 text-sm font-bold text-moss-950 shadow-card hover:bg-lime/90">View attempted answers</Link></div></Card>
      </section>
    </div>
  );
};

export const ParentMentorshipAttemptReviewPage = () => {
  const { studentId = '', batchId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-attempt-analysis-rich', studentId, attemptId], queryFn: () => api<{ analysis: BatchAnalysis }>(`/api/v1/parents/students/${studentId}/mentorship/batch-attempts/${attemptId}`).then((response) => response.analysis) });
  const [sectionId, setSectionId] = useState('all');
  const [difficultyId, setDifficultyId] = useState('all');
  const [status, setStatus] = useState('all');
  const analysis = query.data;
  const filteredAnswers = (analysis?.answers ?? []).filter((answer) => (sectionId === 'all' || answer.sectionId === sectionId) && (difficultyId === 'all' || answer.difficulty.id === difficultyId) && (status === 'all' || answer.status === status));
  const summary = summarizeBatchAnswers(filteredAnswers);
  if (query.isLoading) return <PageSkeleton />;
  if (!analysis) return <EmptyState icon={Trophy} title="Review unavailable" description="This submitted batch test attempt could not be opened." />;
  return (
    <div className="space-y-7">
      <BackLink to={`${batchRoot(studentId, batchId || analysis.test.batchId)}/tests/attempts/${attemptId}/analysis`}>Batch test analysis</BackLink>
      <section className="rounded-4xl bg-moss-800 p-7 text-white shadow-card"><Badge className="bg-white/12 text-lime">Attempted answers</Badge><h1 className="mt-4 text-3xl font-semibold">{analysis.test.name}</h1><p className="mt-2 text-sm text-moss-100/75">Question-by-question read-only review for {analysis.test.batchName}.</p></section>
      <Card className="p-5"><div className="flex flex-wrap items-center gap-3"><Filter size={17} className="text-moss-700" /><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{analysis.filters.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={difficultyId} onChange={(event) => setDifficultyId(event.target.value)}><option value="all">All difficulty</option>{analysis.filters.difficulties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{['CORRECT', 'INCORRECT', 'PARTIALLY_CORRECT', 'UNATTEMPTED'].map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric icon={Trophy} label="Filtered score" value={summary.score} /><Metric icon={CheckCircle2} label="Correct" value={summary.correct} /><Metric icon={XCircle} label="Incorrect" value={summary.incorrect} /><Metric icon={HelpCircle} label="Unattempted" value={summary.unattempted} /></div></Card>
      <section className="space-y-4">{filteredAnswers.map((answer, index) => <AnswerCard key={answer.id} answer={answer} index={index} />)}</section>
    </div>
  );
};

export const ParentMentorshipAnalysisPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-tests', studentId, batchId], queryFn: () => api<{ tests: TestSummary[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/tests`) });
  const attempted = (query.data?.tests ?? []).filter((test) => (test.latestAttemptStatus === 'SUBMITTED' || test.latestAttemptStatus === 'AUTO_SUBMITTED') && test.latestAttemptId);
  return (
    <div className="space-y-6">
      <BatchBack studentId={studentId} batchId={batchId} />
      <Card className="overflow-hidden p-0"><div className="grid gap-6 bg-moss-800 p-7 text-white lg:grid-cols-[1fr_280px]"><div><Badge className="bg-white/12 text-lime">Mentorship performance</Badge><h1 className="mt-4 text-3xl font-semibold">Batch-test analysis</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">Submitted mentorship tests for this batch, with links to full analysis and question review.</p></div><div className="grid place-items-center rounded-3xl bg-white/10"><Sparkles size={42} className="text-lime" /></div></div></Card>
      <Link className="inline-flex items-center gap-2 rounded-xl bg-moss-100 px-4 py-2 text-sm font-semibold text-moss-800 hover:bg-moss-200" to={`${batchRoot(studentId, batchId)}/test-bookmarks`}><Bookmark size={16} />View bookmarked answers</Link>
      {query.isLoading ? <Skeleton className="h-60" /> : attempted.length ? <div className="grid gap-4 lg:grid-cols-2">{attempted.map((test) => <Link key={test.id} to={`${batchRoot(studentId, batchId)}/tests/attempts/${test.latestAttemptId}/analysis`} className="block"><Card className="p-5 transition hover:-translate-y-px hover:shadow-card"><div className="flex items-start justify-between gap-3"><div><Badge className="bg-moss-100 text-moss-800">Attempted</Badge><h2 className="mt-3 text-lg font-bold">{test.name}</h2><p className="mt-1 line-clamp-2 text-sm text-stone-500">{test.description}</p></div><BarChart3 className="text-moss-700" /></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500"><span>{test.questionCount} questions</span><span>{test.totalMarks} marks</span><span>{test.durationMinutes} min</span><span>{test.difficulty}</span></div></Card></Link>)}</div> : <EmptyState icon={Trophy} title="No submitted batch tests yet" description="Once the student submits a mentorship batch test, it will appear here." />}
    </div>
  );
};

export const ParentMentorshipAllAttemptsPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-all-attempts', studentId], queryFn: () => api<{ attempts: BatchAttemptRow[] }>(`/api/v1/parents/students/${studentId}/mentorship/attempts`) });
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data?.attempts.length) return <EmptyState icon={Trophy} title="No mentorship test attempts" description="Submitted batch tests will appear here." />;
  return (
    <div className="space-y-6">
      <BackLink to={`/parent/students/${studentId}`}>Student overview</BackLink>
      <div><p className="eyebrow">All mentorship attempts</p><h1 className="text-3xl font-bold">Batch-test history</h1></div>
      <div className="grid gap-4 lg:grid-cols-2">{query.data.attempts.map((attempt) => <Link key={attempt.id} to={`${batchRoot(studentId, attempt.test.batch.id)}/tests/attempts/${attempt.id}/analysis`}><Card className="p-5 transition hover:-translate-y-px hover:shadow-card"><div className="flex justify-between gap-3"><div><Badge>{attempt.test.program.name}</Badge><h2 className="mt-3 text-lg font-bold">{attempt.test.name}</h2><p className="mt-1 text-sm text-stone-500">{attempt.test.batch.name} · {attempt.test.difficulty.name}</p></div><p className="text-xl font-bold text-moss-800">{attempt.marksScored}/{attempt.totalMarks}</p></div><p className="mt-4 text-sm text-stone-500">{Math.round(attempt.accuracy)}% accuracy · {attempt.correctAnswers}C/{attempt.incorrectAnswers}W/{attempt.unattemptedAnswers}U</p></Card></Link>)}</div>
    </div>
  );
};

export const ParentMentorshipBatchBookmarksPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mentor-bookmarks', studentId, batchId], queryFn: () => api<{ answers: (BatchAnswer & { attemptId: string; test: { id: string; name: string; submittedAt: string | null } })[] }>(`/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/test-bookmarks`) });
  if (query.isLoading) return <PageSkeleton />;
  return <div className="space-y-6"><BackLink to={`${batchRoot(studentId, batchId)}/analysis`}>Analysis</BackLink><div><p className="eyebrow">Revision bank</p><h1 className="text-3xl font-bold">Bookmarked batch-test answers</h1></div>{query.data?.answers.length ? query.data.answers.map((answer, index) => <AnswerCard key={answer.id} answer={answer} index={index} testName={answer.test.name} />) : <EmptyState icon={Bookmark} title="No bookmarked answers yet" description="Bookmarked mentorship answers will appear here." />}</div>;
};

export const ParentMentorshipDoubtsPage = () => {
  const { studentId = '', batchId = '' } = useParams();
  const [scope, setScope] = useState<'mine' | 'public'>('mine');
  const [status, setStatus] = useState<'ALL' | DoubtStatus>('ALL');
  const queryPath = `/api/v1/parents/students/${studentId}/mentorship/batches/${batchId}/doubts?scope=${scope}${scope === 'public' && status !== 'ALL' ? `&status=${status}` : ''}`;
  const doubts = useQuery({ queryKey: ['parent-mentor-doubts', studentId, batchId, scope, status], queryFn: () => api<{ doubts: Doubt[] }>(queryPath) });
  if (doubts.isLoading) return <PageSkeleton />;
  return (
    <div className="space-y-6">
      <BatchBack studentId={studentId} batchId={batchId} />
      <div><p className="eyebrow">Read-only discussion view</p><h1 className="text-3xl font-bold">Doubts</h1><p className="mt-2 text-sm text-stone-500">Parents can read the student’s private doubts and public batch doubts. Replying remains inside the student workspace.</p></div>
      <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant={scope === 'mine' ? 'primary' : 'outline'} onClick={() => setScope('mine')}>Student doubts</Button><Button size="sm" variant={scope === 'public' ? 'primary' : 'outline'} onClick={() => setScope('public')}>Public doubts</Button>{scope === 'public' && <select value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | DoubtStatus)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"><option value="ALL">All public</option><option value="OPEN">Open</option><option value="ANSWERED">Answered</option><option value="CLOSED">Closed</option></select>}</div>
      {doubts.data?.doubts.length ? <div className="space-y-4">{doubts.data.doubts.map((doubt) => <DoubtCard key={doubt.id} doubt={doubt} studentId={studentId} />)}</div> : <EmptyState icon={MessageCircleQuestion} title="No doubts found" description="Try another filter or check back later." />}
    </div>
  );
};

const BatchHero = ({ batch }: { batch: Overview }) => (
  <section className="overflow-hidden rounded-4xl bg-moss-800 text-white shadow-card">
    <div className="grid gap-6 p-7 lg:grid-cols-[1fr_360px]">
      <div><Badge className="bg-white/12 text-lime">Batch workspace</Badge><h1 className="mt-4 text-3xl font-semibold tracking-tight">{batch.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">{batch.description}</p><div className="mt-5 flex flex-wrap gap-2">{batch.mentors.map((mentor) => <PersonBadge key={mentor.id} name={mentor.name} role="MENTOR" />)}</div></div>
      <div className="grid grid-cols-2 gap-3"><HeroStat label="active tasks" value={batch.stats.activeTasks} /><HeroStat label="live now" value={batch.stats.liveSessions} /><HeroStat label="completed" value={batch.stats.completedTasks} /><HeroStat label="doubts" value={batch.stats.visibleDoubts} /></div>
    </div>
  </section>
);

const NavCard = ({ to, icon: Icon, title, text, color, highlight }: { to: string; icon: typeof ClipboardCheck; title: string; text: string; color: string; highlight?: boolean }) => (
  <Link to={to} className={cn('rounded-3xl border border-stone-200 p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card', highlight ? 'bg-[#fbfff3]' : 'bg-white')}><Icon className={color} /><p className="mt-4 font-bold">{title}</p><p className="mt-1 text-sm text-stone-500">{text}</p></Link>
);

const TaskRow = ({ task }: { task: Task }) => {
  const completed = task.completion?.status === 'COMPLETED';
  return <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{task.title}</p><Badge className={phaseBadgeClass(task.phase)}>{phaseLabel(task.phase)}</Badge>{completed && <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>}</div><p className="mt-1 text-sm leading-6 text-stone-600">{task.description}</p><div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-stone-500"><span>Starts {formatDateTime(task.startDatetime)}</span><span>Ends {formatDateTime(task.endDatetime)}</span>{task.createdBy && <PersonBadge name={task.createdBy.name} role="MENTOR" />}</div></div><Badge className={task.phase === 'PAST' ? (completed ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600') : phaseBadgeClass(task.phase)}>{task.phase === 'PAST' ? (completed ? 'Completed on time' : 'Not completed') : task.phase === 'LIVE' ? (completed ? 'Completed' : 'Pending') : 'Opens later'}</Badge></div></div>;
};

const SessionRow = ({ session }: { session: Session }) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{session.title}</p><Badge className={phaseBadgeClass(session.phase)}>{phaseLabel(session.phase)}</Badge>{session.attended && <Badge className="bg-emerald-100 text-emerald-800">Attended</Badge>}</div><p className="mt-1 text-sm leading-6 text-stone-600">{session.description}</p><div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-stone-500"><span>Starts {formatDateTime(session.startDatetime)}</span><span>Ends {formatDateTime(session.endDatetime)}</span>{session.createdBy && <PersonBadge name={session.createdBy.name} role="MENTOR" />}</div>{session.meetingLink && <p className="mt-2 break-all text-xs text-stone-400">{session.meetingLink}</p>}</div>
      <Badge className={session.phase === 'PAST' ? (session.attended ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600') : phaseBadgeClass(session.phase)}>{session.phase === 'PAST' ? (session.attended ? 'Attended' : 'Not attended') : session.phase === 'LIVE' ? 'Live now' : 'Not open yet'}</Badge>
    </div>
  </div>
);

const TestRow = ({ test, studentId, batchId }: { test: TestSummary; studentId: string; batchId: string }) => {
  const to = test.attempted && test.latestAttemptId ? `${batchRoot(studentId, batchId)}/tests/attempts/${test.latestAttemptId}/analysis` : `${batchRoot(studentId, batchId)}/tests/${test.id}`;
  return <Link to={to} className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:-translate-y-px hover:border-moss-200 hover:shadow-card"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{test.phase === 'LIVE' && <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(34,197,94,.15)]" />}<p className="font-semibold text-ink">{test.name}</p><Badge className={phaseBadgeClass(test.phase)}>{phaseLabel(test.phase)}</Badge>{test.attempted && <Badge className="bg-moss-100 text-moss-800">Attempted</Badge>}</div><p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">{test.description}</p><div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-stone-500"><span>Ends {formatDateTime(test.endDatetime)}</span><span>{test.questionCount} questions</span>{test.sectionCount ? <span>{test.sectionCount} sections</span> : null}<span>{test.totalMarks} marks</span><span>{test.durationMinutes} min</span><span>{test.difficulty}</span></div></div><ArrowRight className="shrink-0 text-stone-400" size={19} /></div></Link>;
};

const NoticeCard = ({ notice, compact }: { notice: Notice; compact?: boolean }) => (
  <Card className={cn('p-5', compact && 'shadow-none')}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{notice.title}</h2>{notice.createdByAdmin ? <PersonBadge name={notice.createdByAdmin.name} role={notice.createdByAdmin.role} /> : notice.createdByMentor ? <PersonBadge name={notice.createdByMentor.name} role="MENTOR" /> : null}</div><p className="mt-2 text-sm leading-6 text-stone-600">{notice.description}</p></div><Badge>{formatDateTime(notice.createdAt)}</Badge></div>{notice.attachmentUrl && <a href={notice.attachmentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-moss-700"><ExternalLink size={15} /> Attachment</a>}
  </Card>
);

const DoubtCard = ({ doubt, studentId }: { doubt: Doubt; studentId: string }) => {
  const [open, setOpen] = useState(false);
  return <Card className="overflow-hidden p-0"><div className="border-b border-stone-100 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge className={doubt.visibility === 'PUBLIC' ? 'bg-sky-100 text-sky-800' : 'bg-stone-100 text-stone-700'}>{doubt.visibility === 'PUBLIC' ? <UsersRound size={12} /> : <LockKeyhole size={12} />} {doubt.visibility}</Badge><Badge className={doubt.status === 'CLOSED' ? 'bg-stone-100 text-stone-700' : doubt.status === 'ANSWERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber/20 text-[#93620c]'}>{doubt.status}</Badge>{doubt.isPinned && <Badge className="bg-lime/40 text-moss-900"><Pin size={12} /> Pinned</Badge>}</div><h2 className="mt-3 text-lg font-bold text-ink">{doubt.title}</h2></div></div><p className="mt-3 text-sm leading-6 text-stone-600">{doubt.description}</p><div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-stone-400"><PersonBadge name={doubt.student.name} role="STUDENT" /><span>{formatDateTime(doubt.createdAt)}</span><span>{doubt._count.replies} replies</span></div></div><div className="bg-stone-50/60 p-5"><button className="inline-flex items-center gap-2 text-sm font-bold text-moss-700" onClick={() => setOpen((value) => !value)}><MessageSquareReply size={16} /> {open ? 'Hide thread' : 'Open thread'}</button>{open && <ReplyThread doubtId={doubt.id} studentId={studentId} />}</div></Card>;
};

const ReplyThread = ({ doubtId, studentId, parentReplyId }: { doubtId: string; studentId: string; parentReplyId?: string | null }) => {
  const [take, setTake] = useState(3);
  const [children, setChildren] = useState<Record<string, boolean>>({});
  const query = useQuery({ queryKey: ['parent-mentor-replies', studentId, doubtId, parentReplyId ?? 'root', take], queryFn: () => api<{ replies: Reply[] }>(`/api/v1/parents/students/${studentId}/mentorship/doubts/${doubtId}/replies?take=${take}${parentReplyId ? `&parentReplyId=${parentReplyId}` : ''}`) });
  if (query.isLoading) return <Skeleton className="mt-4 h-24" />;
  return <div className={cn('space-y-3', parentReplyId ? 'mt-3 border-l border-stone-200 pl-4' : 'mt-4')}>{query.data?.replies.map((reply) => <div key={reply.id} className={cn('rounded-2xl border bg-white p-4', reply.isPinned ? 'border-lime/70 shadow-sm' : 'border-stone-200')}><div className="flex flex-wrap items-center gap-2"><ReplyAuthor reply={reply} />{reply.isPinned && <Badge className="bg-lime/40 text-moss-900"><Pin size={12} /> Pinned</Badge>}<span className="text-xs font-medium text-stone-400">{formatDateTime(reply.createdAt)}</span></div><p className="mt-3 text-sm leading-6 text-stone-600">{reply.replyText}</p>{reply._count.childReplies > 0 && <button className="mt-3 text-xs font-bold text-moss-700" onClick={() => setChildren((state) => ({ ...state, [reply.id]: !state[reply.id] }))}>{children[reply.id] ? 'Hide replies' : `Show ${reply._count.childReplies} replies`}</button>}{children[reply.id] && <ReplyThread doubtId={doubtId} studentId={studentId} parentReplyId={reply.id} />}</div>)}{!parentReplyId && !query.data?.replies.length && <p className="text-sm text-stone-500">No replies yet.</p>}{!parentReplyId && (query.data?.replies.length ?? 0) >= take && <button className="text-sm font-bold text-moss-700" onClick={() => setTake((value) => value + 3)}>Load more replies</button>}</div>;
};

const ReplyAuthor = ({ reply }: { reply: Reply }) => reply.admin ? <PersonBadge name={reply.admin.name} role={reply.admin.role} /> : reply.mentor ? <PersonBadge name={reply.mentor.name} role="MENTOR" /> : <PersonBadge name={reply.student?.name ?? 'Student'} role="STUDENT" />;

const PersonBadge = ({ name, role = 'MENTOR' }: { name?: string; role?: string }) => {
  const label = role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'SUB_ADMIN' ? 'Sub Admin' : role === 'STUDENT' ? 'Student' : 'Mentor';
  const color = role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : role === 'SUB_ADMIN' ? 'bg-indigo-100 text-indigo-800' : role === 'STUDENT' ? 'bg-sky-100 text-sky-800' : 'bg-moss-100 text-moss-800';
  return <Badge className={color}>{name ? `${name} · ${label}` : label}</Badge>;
};

const AnswerCard = ({ answer, index, testName }: { answer: BatchAnswer; index: number; testName?: string }) => (
  <Card className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2">{testName && <Badge className="bg-moss-100 text-moss-800">{testName}</Badge>}<Badge className={answerStatusClass(answer.status)}>{answer.status.replace('_', ' ')}</Badge>{answer.bookmarked && <Badge className="bg-lime/40 text-moss-900"><Bookmark size={13} /> Bookmarked</Badge>}</div><h3 className="mt-3 font-bold">Q{index + 1}. {answer.question}</h3></div></div>
    {answer.comprehension && <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{answer.comprehension.passage}</div>}
    {answer.imageUrl && <img src={answer.imageUrl} alt="" className="mt-4 max-h-72 rounded-2xl object-contain" />}
    <BatchOptionReview options={answer.options} selected={normalizeAnswers(answer.selectedAnswers)} correct={normalizeAnswers(answer.correctAnswers)} />
    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><InfoBox label="Student answer" value={normalizeAnswers(answer.selectedAnswers).join(', ') || 'Unattempted'} /><InfoBox label="Correct answer" value={normalizeAnswers(answer.correctAnswers).join(', ')} /><InfoBox label="Marks" value={`${answer.marksAwarded} / +${answer.positiveMarks}`} /><InfoBox label="Time" value={`${answer.timeTakenSeconds}s · avg ${answer.averageTimeTakenSeconds}s`} /></div>
    <div className="mt-4 rounded-2xl bg-moss-50 p-4 text-sm leading-6 text-moss-900"><b>Explanation:</b> {answer.explanation}</div>
    <p className="mt-3 text-xs text-stone-500">{answer.sectionName} · {answer.topic.subject?.name} / {answer.topic.name} / {answer.subtopic.name} · {answer.difficulty.name}</p>
  </Card>
);

const BatchOptionReview = ({ options, selected, correct }: { options: unknown; selected: string[]; correct: string[] }) => (
  <div className="mt-4 grid gap-2">{normalizeOptions(options).map((option) => { const isSelected = selected.includes(option.value); const isCorrect = correct.includes(option.value); return <div key={option.value} className={cn('rounded-2xl border p-3 text-sm', isCorrect ? 'border-moss-300 bg-moss-50' : isSelected ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-white')}><b>{option.value}.</b> {option.label}{isSelected && <span className="ml-2 text-xs font-bold">(student answer)</span>}{isCorrect && <span className="ml-2 text-xs font-bold">(correct)</span>}</div>; })}</div>
);

const CalendarGrid = ({ days, firstDay }: { days: CalendarDay[]; firstDay: number }) => (
  <><div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-bold text-stone-400">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-2">{Array.from({ length: firstDay }).map((_, index) => <div key={`blank-${index}`} />)}{days.map((day) => <div key={day.date} title={day.sessionCount ? `${day.attendedCount}/${day.sessionCount} attended` : 'No live session'} className={cn('aspect-square rounded-2xl border p-1.5 text-left text-xs font-semibold', day.sessionCount === 0 && 'border-stone-100 bg-stone-50 text-stone-300', day.sessionCount > 0 && day.attendedCount === 0 && 'border-amber/40 bg-amber/10 text-[#8a620b]', day.attendedCount > 0 && 'border-emerald-200 bg-emerald-50 text-emerald-800')}><span>{Number(day.date.slice(-2))}</span>{day.attendedCount > 0 && <span className="mt-2 block size-2 rounded-full bg-emerald-500" />}</div>)}</div></>
);

const AttendanceHistory = ({ days }: { days: CalendarDay[] }) => <div className="mt-5 rounded-2xl bg-stone-50 p-4"><h3 className="text-sm font-bold">Attendance history</h3><div className="mt-3 space-y-2">{days.filter((day) => day.sessionCount > 0).slice(0, 6).map((day) => <div key={day.date} className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-stone-700">{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', day.attendedCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600')}>{day.attendedCount}/{day.sessionCount} attended</span></div>)}{!days.some((day) => day.sessionCount > 0) && <p className="text-sm text-stone-500">No sessions scheduled this month.</p>}</div></div>;
const MonthControls = ({ month, setMonth }: { month: string; setMonth: (value: string | ((value: string) => string)) => void }) => <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => setMonth((value) => { const date = new Date(`${value}-01T00:00:00`); date.setMonth(date.getMonth() - 1); return date.toISOString().slice(0, 7); })}>Prev</Button><Badge>{month}</Badge><Button size="sm" variant="outline" onClick={() => setMonth((value) => { const date = new Date(`${value}-01T00:00:00`); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 7); })}>Next</Button></div>;

const BackLink = ({ to, children }: { to: string; children: string }) => <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700 hover:text-moss-900"><ChevronLeft size={16} /> {children}</Link>;
const BatchBack = ({ studentId, batchId }: { studentId: string; batchId: string }) => <BackLink to={batchRoot(studentId, batchId)}>Batch dashboard</BackLink>;
const ListHeader = ({ title, to, label }: { title: string; to: string; label: string }) => <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{title}</h2><Link to={to} className="text-sm font-semibold text-moss-700">{label}</Link></div>;
const EmptyPanel = ({ icon, title, description }: { icon: typeof CalendarDays; title: string; description: string }) => <EmptyState compact icon={icon} title={title} description={description} />;
const HeroStat = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-moss-100/70">{label}</p></div>;
const Metric = ({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string | number }) => <Card className="bg-stone-50 p-4 shadow-none"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-moss-50 text-moss-800"><Icon size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-stone-400">{label}</p><p className="text-xl font-bold">{value}</p></div></div></Card>;
const InfoBox = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-400">{label}</p><p className="font-semibold text-ink">{value}</p></div>;
const HistoryPage = ({ title, eyebrow, backTo, children }: { title: string; eyebrow: string; backTo: string; children: ReactNode }) => <div className="space-y-6"><BackLink to={backTo}>Back</BackLink><div><p className="eyebrow">{eyebrow}</p><h1 className="text-3xl font-bold">{title}</h1></div><div className="space-y-3">{children}</div></div>;
const PageSkeleton = () => <div className="space-y-6"><Skeleton className="h-44 rounded-4xl" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div></div>;

const normalizeAnswers = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const normalizeOptions = (value: unknown) => Array.isArray(value) ? value.map((item, index) => typeof item === 'string' ? { value: String.fromCharCode(65 + index), label: item } : { value: String((item as { id?: string; value?: string }).id ?? (item as { value?: string }).value ?? String.fromCharCode(65 + index)), label: String((item as { text?: string; label?: string }).text ?? (item as { label?: string }).label ?? JSON.stringify(item)) }) : [];
const answerStatusClass = (status: string) => status === 'CORRECT' ? 'bg-moss-100 text-moss-800' : status === 'UNATTEMPTED' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-700';
const summarizeBatchAnswers = (answers: BatchAnswer[]) => ({ score: Number(answers.reduce((sum, answer) => sum + answer.marksAwarded, 0).toFixed(2)), correct: answers.filter((answer) => answer.status === 'CORRECT').length, incorrect: answers.filter((answer) => answer.status === 'INCORRECT' || answer.status === 'PARTIALLY_CORRECT').length, unattempted: answers.filter((answer) => answer.status === 'UNATTEMPTED').length });
const aggregateSectionAnalytics = (sections: SectionAnalytics[]): SectionAnalytics => ({ totalAttempts: sections.reduce((sum, section) => Math.max(sum, section.totalAttempts), 0), averageScore: 0, highestScore: 0, lowestScore: 0, averageAccuracy: 0, averageTimeTakenSeconds: 0, totalCorrectAnswers: sections.reduce((sum, section) => sum + section.totalCorrectAnswers, 0), totalIncorrectAnswers: sections.reduce((sum, section) => sum + section.totalIncorrectAnswers, 0), totalUnattemptedAnswers: sections.reduce((sum, section) => sum + section.totalUnattemptedAnswers, 0) });
const percentOfAnswers = (value: number, analytics: SectionAnalytics) => { const total = analytics.totalCorrectAnswers + analytics.totalIncorrectAnswers + analytics.totalUnattemptedAnswers; return total ? Number(((value / total) * 100).toFixed(1)) : 0; };
