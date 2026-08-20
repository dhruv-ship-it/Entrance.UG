import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpenCheck, CalendarCheck2, CheckCircle2, ChevronLeft, ClipboardCheck, Clock3, FileText, Filter, GraduationCap, HelpCircle, MessageCircleQuestion, MessageSquareReply, Plus, Radio, Search, Send, Trophy, UsersRound, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { cn, formatDateTime } from '../../lib/utils';

type Phase = 'LIVE' | 'UPCOMING' | 'PAST';
type Program = { id: string; name: string; description: string; _count: { batches: number } };
type Batch = { id: string; name: string; description: string; mentorshipProgram?: { id: string; name: string }; studentAccesses?: unknown[]; _count?: { tasks: number; liveSessions: number; tests: number; doubts: number } };
type Overview = { id: string; name: string; description: string; program: { id: string; name: string }; stats: { activeTasks: number; liveSessions: number; liveTests: number; students: number; openDoubts: number }; tasks: Task[]; sessions: Session[]; notices: Notice[]; tests: Test[] };
type Task = { id: string; title: string; description: string; attachmentUrl?: string | null; startDatetime: string; endDatetime: string; phase: Phase; completionCount?: number; completionPercent?: number };
type Session = { id: string; title: string; description: string; meetingLink: string; startDatetime: string; endDatetime: string; phase: Phase; attendanceCount: number; attendancePercent: number };
type Notice = { id: string; title: string; description: string; attachmentUrl?: string | null; createdAt: string };
type Test = { id: string; name: string; description: string; instructions?: string; startDatetime: string; endDatetime: string; durationMinutes: number; totalMarks: number; difficulty: string | { id: string; name: string }; phase: Phase; questionCount: number; sectionCount?: number; attemptCount: number; isActive?: boolean; analytics?: { totalAttempts: number; averageScore: number; highestScore: number; averageAccuracy: number } | null };
type StudentRow = { student: { id: string; name: string; username: string; profileImage?: string | null; className?: string | null; schoolName?: string | null }; joinedAt: string; expiryDate: string; stats: { completedTasks: number; attendedSessions: number; testsAttempted: number; averageScore: number; averageAccuracy: number; openDoubts: number } };
type Doubt = { id: string; title: string; description: string; visibility: 'PUBLIC' | 'PRIVATE'; status: 'OPEN' | 'ANSWERED' | 'CLOSED'; isPinned: boolean; createdAt: string; student: { id: string; name: string; username: string }; _count: { replies: number } };
type Reply = { id: string; replyText: string; isPinned: boolean; createdAt: string; student?: { id: string; name: string; username?: string } | null; mentor?: { id: string; name: string } | null; admin?: { id: string; name: string; role: string } | null; _count: { childReplies: number } };
type AttemptAnalysis = { attempt: { id: string; marksScored: number; totalMarks: number; accuracy: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; submittedAt: string | null }; test: { name: string; batchName: string; marksDistribution: { label: string; count: number }[] }; sections: { id: string; name: string; marksScored: number; totalMarks: number; accuracy: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number }[]; answers: { id: string; sectionName: string; question: string; status: string; marksAwarded: number; explanation: string }[] };

const root = '/mentor';
const batchRoot = (batchId: string) => `${root}/batches/${batchId}`;
const phaseClass = (phase: Phase) => phase === 'LIVE' ? 'bg-lime/45 text-moss-900' : phase === 'UPCOMING' ? 'bg-sky-100 text-sky-800' : 'bg-stone-100 text-stone-600';
const phaseLabel = (phase: Phase) => phase === 'LIVE' ? 'Live now' : phase === 'UPCOMING' ? 'Upcoming' : 'Closed';
const groupByPhase = <T extends { phase: Phase }>(items: T[]) => ({ live: items.filter((x) => x.phase === 'LIVE'), upcoming: items.filter((x) => x.phase === 'UPCOMING'), past: items.filter((x) => x.phase === 'PAST') });

export const MentorProgramsPage = () => {
  const query = useQuery({ queryKey: ['mentor-programs'], queryFn: () => api<{ programs: Program[] }>('/api/v1/mentor/programs') });
  if (query.isLoading) return <PageSkeleton />;
  if (!query.data?.programs.length) return <EmptyState icon={GraduationCap} title="No assigned programs" description="Admin must assign you to mentorship batches before they appear here." />;
  return <div className="space-y-7"><Hero eyebrow="Mentor workspace" title="Your mentorship programs" text="Choose a program, then open a batch to manage classes, tasks, doubts, tests and student progress." /><section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{query.data.programs.map((program) => <Link key={program.id} to={`${root}/programs/${program.id}`}><Card className="p-6 transition hover:-translate-y-px hover:shadow-card"><GraduationCap className="text-moss-700" /><Badge className="mt-5">{program._count.batches} assigned batches</Badge><h2 className="mt-4 text-xl font-bold">{program.name}</h2><p className="mt-2 text-sm leading-6 text-stone-500">{program.description}</p></Card></Link>)}</section></div>;
};

export const MentorBatchesPage = () => {
  const { programId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batches', programId], queryFn: () => api<{ batches: Batch[] }>(`/api/v1/mentor/programs/${programId}/batches`) });
  if (query.isLoading) return <PageSkeleton />;
  return <div className="space-y-6"><Back to={`${root}/programs`}>Programs</Back><div><p className="eyebrow">Assigned cohorts</p><h1 className="text-3xl font-bold">Your batches</h1></div><section className="grid gap-5 lg:grid-cols-2">{query.data?.batches.map((batch) => <Link key={batch.id} to={batchRoot(batch.id)}><Card className="p-6 transition hover:-translate-y-px hover:shadow-card"><h2 className="text-2xl font-bold">{batch.name}</h2><p className="mt-2 text-sm text-stone-500">{batch.description}</p><div className="mt-5 grid grid-cols-4 gap-3"><Mini label="students" value={batch.studentAccesses?.length ?? 0} /><Mini label="tasks" value={batch._count?.tasks ?? 0} /><Mini label="classes" value={batch._count?.liveSessions ?? 0} /><Mini label="doubts" value={batch._count?.doubts ?? 0} /></div></Card></Link>)}</section></div>;
};

export const MentorBatchDashboardPage = () => {
  const { batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-batch', batchId], queryFn: () => api<{ batch: Overview }>(`/api/v1/mentor/batches/${batchId}`) });
  if (query.isLoading) return <PageSkeleton />;
  const batch = query.data?.batch;
  if (!batch) return <EmptyState icon={GraduationCap} title="Batch unavailable" description="This batch is not assigned to you." />;
  return <div className="space-y-6"><Back to={`${root}/programs/${batch.program.id}`}>{batch.program.name}</Back><Hero eyebrow="Batch command center" title={batch.name} text={batch.description} stats={[['students', batch.stats.students], ['active tasks', batch.stats.activeTasks], ['live classes', batch.stats.liveSessions], ['open doubts', batch.stats.openDoubts]]} /><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"><Nav to="students" icon={UsersRound} title="Students" text="Roster and individual progress." /><Nav to="tasks" icon={ClipboardCheck} title="Tasks" text="Create, reopen and track work." /><Nav to="classes" icon={CalendarCheck2} title="Classes" text="Schedule and attendance." /><Nav to="doubts" icon={MessageCircleQuestion} title="Doubts" text="Reply and close threads." /><Nav to="tests" icon={BookOpenCheck} title="Tests" text="Build and review tests." /><Nav to="notices" icon={FileText} title="Notices" text="Announcements." /></section><section className="grid gap-5 xl:grid-cols-2"><Panel title="Active tasks" to="tasks">{batch.tasks.length ? batch.tasks.map((t) => <TaskCard key={t.id} task={t} />) : <EmptyState compact icon={ClipboardCheck} title="No active task" description="Create one from Tasks." />}</Panel><Panel title="Live classes" to="classes">{batch.sessions.length ? batch.sessions.map((s) => <SessionCard key={s.id} session={s} />) : <EmptyState compact icon={Radio} title="No class live now" description="Schedule one from Classes." />}</Panel><Panel title="Live tests" to="tests">{batch.tests.length ? batch.tests.map((t) => <TestCard key={t.id} test={t} batchId={batchId} />) : <EmptyState compact icon={Trophy} title="No live test" description="Create tests from Tests." />}</Panel><Panel title="Latest notices" to="notices">{batch.notices.length ? batch.notices.map((n) => <NoticeCard key={n.id} notice={n} />) : <EmptyState compact icon={FileText} title="No notices" description="Post announcements from Notices." />}</Panel></section></div>;
};

export const MentorStudentsPage = () => {
  const { batchId = '' } = useParams();
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['mentor-students', batchId, search], queryFn: () => api<{ students: StudentRow[] }>(`/api/v1/mentor/batches/${batchId}/students?search=${encodeURIComponent(search)}`) });
  return <div className="space-y-6"><BatchBack batchId={batchId} /><Header title="Students" eyebrow="Batch roster" action={<div className="relative"><Search className="absolute left-3 top-3 text-stone-400" size={16} /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or username" /></div>} />{query.isLoading ? <PageSkeleton /> : <div className="grid gap-4 lg:grid-cols-2">{query.data?.students.map((row) => <Link key={row.student.id} to={`${batchRoot(batchId)}/students/${row.student.id}`}><Card className="p-5 transition hover:shadow-card"><div className="flex justify-between gap-3"><div><h2 className="font-bold">{row.student.name}</h2><p className="text-sm text-stone-500">@{row.student.username}</p></div><Badge>{row.stats.testsAttempted} tests</Badge></div><div className="mt-4 grid grid-cols-4 gap-2"><Mini label="tasks" value={row.stats.completedTasks} /><Mini label="classes" value={row.stats.attendedSessions} /><Mini label="avg score" value={row.stats.averageScore} /><Mini label="doubts" value={row.stats.openDoubts} /></div></Card></Link>)}</div>}</div>;
};

export const MentorStudentDetailPage = () => {
  const { batchId = '', studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-student', batchId, studentId], queryFn: () => api<any>(`/api/v1/mentor/batches/${batchId}/students/${studentId}`) });
  if (query.isLoading) return <PageSkeleton />;
  const data = query.data?.student;
  if (!data) return <EmptyState icon={UsersRound} title="Student unavailable" description="Could not open this student." />;
  return <div className="space-y-6"><Back to={`${batchRoot(batchId)}/students`}>Students</Back><Hero eyebrow="Student batch profile" title={data.student.name} text={`@${data.student.username} · ${data.student.className ?? ''} ${data.student.schoolName ?? ''}`} stats={[['tests', data.attempts.length], ['tasks done', data.tasks.length], ['classes attended', data.sessions.length], ['doubts', data.doubts.length]]} /><section className="grid gap-5 xl:grid-cols-2"><Panel title="Batch test attempts">{data.attempts.map((a: any) => <Link key={a.id} to={`${batchRoot(batchId)}/tests/attempts/${a.id}/analysis`}><Card className="p-4 shadow-none"><div className="flex justify-between"><p className="font-semibold">{a.test.name}</p><Badge>{a.marksScored}/{a.totalMarks}</Badge></div><p className="mt-2 text-sm text-stone-500">{Math.round(a.accuracy)}% accuracy · {a.correctAnswers}C/{a.incorrectAnswers}W/{a.unattemptedAnswers}U</p></Card></Link>)}</Panel><Panel title="Recent doubts">{data.doubts.map((d: any) => <Card key={d.id} className="p-4 shadow-none"><Badge>{d.status}</Badge><p className="mt-2 font-semibold">{d.title}</p><p className="text-sm text-stone-500">{d._count.replies} replies</p></Card>)}</Panel><Panel title="Completed tasks">{data.tasks.map((t: any) => <Card key={t.id} className="p-4 shadow-none"><p className="font-semibold">{t.title}</p><p className="text-sm text-stone-500">{t.completedAt ? formatDateTime(t.completedAt) : t.status}</p></Card>)}</Panel><Panel title="Attendance">{data.sessions.map((s: any) => <Card key={s.id} className="p-4 shadow-none"><p className="font-semibold">{s.title}</p><p className="text-sm text-stone-500">Joined {formatDateTime(s.joinedAt)}</p></Card>)}</Panel></section></div>;
};

export const MentorTasksPage = () => <CrudList kind="tasks" title="Tasks" endpoint="tasks" Form={TaskForm} render={(item: Task) => <TaskCard task={item} />} />;
export const MentorClassesPage = () => <CrudList kind="classes" title="Live classes" endpoint="sessions" Form={SessionForm} render={(item: Session) => <SessionCard session={item} />} />;
export const MentorNoticesPage = () => <CrudList kind="notices" title="Notices" endpoint="notices" Form={NoticeForm} render={(item: Notice) => <NoticeCard notice={item} />} />;

function CrudList({ title, endpoint, Form, render }: { kind: string; title: string; endpoint: string; Form: any; render: (item: any) => JSX.Element }) {
  const { batchId = '' } = useParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mentor-crud', endpoint, batchId], queryFn: () => api<any>(`/api/v1/mentor/batches/${batchId}/${endpoint}`) });
  const key = endpoint === 'sessions' ? 'sessions' : endpoint;
  const save = useMutation({
    mutationFn: (body: any) => api(editing ? `/api/v1/mentor/${endpoint === 'sessions' ? 'sessions' : endpoint}/${editing.id}` : `/api/v1/mentor/batches/${batchId}/${endpoint}`, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => { setOpen(false); setEditing(null); await client.invalidateQueries({ queryKey: ['mentor-crud', endpoint, batchId] }); },
  });
  const rows = query.data?.[key] ?? [];
  return <div className="space-y-6"><BatchBack batchId={batchId} /><Header title={title} eyebrow="Manage batch" action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} />New</Button>} />{open && <Form initial={editing} pending={save.isPending} onCancel={() => setOpen(false)} onSubmit={(body: any) => save.mutate(body)} />}{query.isLoading ? <PageSkeleton /> : <div className="space-y-3">{rows.map((item: any) => <div key={item.id} onDoubleClick={() => { setEditing(item); setOpen(true); }}>{render(item)}</div>)}</div>}</div>;
}

export const MentorDoubtsPage = () => {
  const { batchId = '' } = useParams();
  const [status, setStatus] = useState('OPEN');
  const [visibility, setVisibility] = useState('');
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['mentor-doubts', batchId, status, visibility, search], queryFn: () => api<{ doubts: Doubt[] }>(`/api/v1/mentor/batches/${batchId}/doubts?status=${status}&visibility=${visibility}&search=${encodeURIComponent(search)}`) });
  return <div className="space-y-6"><BatchBack batchId={batchId} /><Header title="Doubts" eyebrow="Batch discussion" /><Card className="p-4"><div className="flex flex-wrap gap-3"><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="">All status</option><option>OPEN</option><option>ANSWERED</option><option>CLOSED</option></select><select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="">All visibility</option><option>PUBLIC</option><option>PRIVATE</option></select><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doubt/student" /></div></Card>{query.isLoading ? <PageSkeleton /> : <div className="space-y-4">{query.data?.doubts.map((doubt) => <DoubtCard key={doubt.id} doubt={doubt} />)}</div>}</div>;
};

const DoubtCard = ({ doubt }: { doubt: Doubt }) => {
  const [open, setOpen] = useState(false);
  return <Card className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge>{doubt.visibility}</Badge><Badge>{doubt.status}</Badge>{doubt.isPinned && <Badge className="bg-lime/40 text-moss-900">Pinned</Badge>}</div><h2 className="mt-3 text-lg font-bold">{doubt.title}</h2><p className="mt-2 text-sm text-stone-600">{doubt.description}</p><p className="mt-3 text-xs text-stone-400">@{doubt.student.username} · {formatDateTime(doubt.createdAt)} · {doubt._count.replies} replies</p></div><Button variant="outline" onClick={() => setOpen(!open)}><MessageSquareReply size={15} />Thread</Button></div>{open && <ReplyThread doubtId={doubt.id} />}</Card>;
};

const ReplyThread = ({ doubtId }: { doubtId: string }) => {
  const [text, setText] = useState('');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mentor-replies', doubtId], queryFn: () => api<{ replies: Reply[] }>(`/api/v1/mentor/doubts/${doubtId}/replies?take=10`) });
  const reply = useMutation({ mutationFn: () => api(`/api/v1/mentor/doubts/${doubtId}/replies`, { method: 'POST', body: JSON.stringify({ replyText: text }) }), onSuccess: async () => { setText(''); await client.invalidateQueries({ queryKey: ['mentor-replies', doubtId] }); } });
  return <div className="mt-5 rounded-2xl bg-stone-50 p-4"><div className="space-y-3">{query.data?.replies.map((r) => <div key={r.id} className="rounded-2xl bg-white p-4"><Badge>{r.mentor ? 'Mentor' : r.student ? 'Student' : 'Admin'}</Badge><p className="mt-2 text-sm">{r.replyText}</p><p className="mt-2 text-xs text-stone-400">{formatDateTime(r.createdAt)}</p></div>)}</div><div className="mt-4 flex gap-2"><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply as mentor" /><Button disabled={!text.trim() || reply.isPending} onClick={() => reply.mutate()}><Send size={15} />Send</Button></div></div>;
};

export const MentorTestsPage = () => {
  const { batchId = '' } = useParams();
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['mentor-tests', batchId], queryFn: () => api<{ tests: Test[] }>(`/api/v1/mentor/batches/${batchId}/tests`) });
  return <div className="space-y-6"><BatchBack batchId={batchId} /><Header title="Batch tests" eyebrow="Assessments" action={<Button onClick={() => setOpen(!open)}><Plus size={16} />New test</Button>} />{open && <TestForm onCreated={() => { setOpen(false); void query.refetch(); }} />}{query.isLoading ? <PageSkeleton /> : <div className="grid gap-4 lg:grid-cols-2">{query.data?.tests.map((test) => <TestCard key={test.id} test={test} batchId={batchId} />)}</div>}</div>;
};

export const MentorTestDetailPage = () => {
  const { testId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-test', testId], queryFn: () => api<any>(`/api/v1/mentor/tests/${testId}`) });
  if (query.isLoading) return <PageSkeleton />;
  const test = query.data?.test;
  if (!test) return <EmptyState icon={Trophy} title="Test unavailable" description="Could not open test." />;
  return <div className="space-y-6"><Back to={`${batchRoot(batchId)}/tests`}>Tests</Back><Hero eyebrow="Batch test" title={test.name} text={test.description} stats={[['sections', test.sections.length], ['questions', test.sections.reduce((s: number, sec: any) => s + sec.questions.length, 0)], ['attempts', test.attempts.length], ['marks', Number(test.totalMarks)]]} /><TestBuilder test={test} /><section className="grid gap-5 xl:grid-cols-[1fr_.8fr]"><Panel title="Sections and questions">{test.sections.length ? test.sections.map((section: any) => <Card key={section.id} className="p-4 shadow-none"><div className="flex justify-between"><p className="font-bold">{section.name}</p><Badge>{section.questions.length} questions</Badge></div><div className="mt-3 space-y-2">{section.questions.map((q: any) => <p key={q.id} className="rounded-xl bg-stone-50 p-3 text-sm">Q{q.sequenceNumber}. {q.question}</p>)}</div></Card>) : <EmptyState compact icon={BookOpenCheck} title="No sections yet" description="Create the first section from the builder above." />}</Panel><Panel title="Submitted attempts">{test.attempts.length ? test.attempts.map((attempt: any) => <Link key={attempt.id} to={`${batchRoot(batchId)}/tests/attempts/${attempt.id}/analysis`}><Card className="p-4 shadow-none"><div className="flex justify-between"><p className="font-semibold">{attempt.student.name}</p><Badge>{Number(attempt.marksScored)}/{Number(attempt.totalMarks)}</Badge></div><p className="mt-2 text-sm text-stone-500">{Math.round(Number(attempt.accuracy))}% accuracy</p></Card></Link>) : <EmptyState compact icon={UsersRound} title="No submissions yet" description="Student attempts will appear here after submission." />}</Panel></section></div>;
};

const TestBuilder = ({ test }: { test: any }) => {
  const [mode, setMode] = useState<'section' | 'question'>('section');
  return <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Test builder</p><h2 className="text-xl font-bold">Build sections and questions</h2><p className="mt-1 text-sm text-stone-500">Mentors can create the full batch-test structure here. Student attempts use the shared test engine.</p></div><div className="flex rounded-2xl bg-stone-100 p-1"><button className={cn('rounded-xl px-4 py-2 text-sm font-semibold', mode === 'section' && 'bg-white shadow-sm')} onClick={() => setMode('section')}>Section</button><button className={cn('rounded-xl px-4 py-2 text-sm font-semibold', mode === 'question' && 'bg-white shadow-sm')} onClick={() => setMode('question')}>Question</button></div></div><div className="mt-5">{mode === 'section' ? <SectionBuilderForm testId={test.id} nextSequence={test.sections.length + 1} /> : <QuestionBuilderForm test={test} />}</div></Card>;
};

const SectionBuilderForm = ({ testId, nextSequence }: { testId: string; nextSequence: number }) => {
  const client = useQueryClient();
  const create = useMutation({ mutationFn: (body: any) => api(`/api/v1/mentor/tests/${testId}/sections`, { method: 'POST', body: JSON.stringify(body) }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['mentor-test', testId] }); } });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    create.mutate({ name: form.name, sequenceNumber: Number(form.sequenceNumber), instructions: form.instructions, durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null, totalMarks: Number(form.totalMarks), canGoBackToPreviousQuestion: form.canGoBackToPreviousQuestion === 'on' });
    event.currentTarget.reset();
  };
  return <form onSubmit={submit} className="grid gap-3 md:grid-cols-4"><Input name="name" placeholder="Section name" required /><Input name="sequenceNumber" type="number" defaultValue={nextSequence} required /><Input name="totalMarks" type="number" step="0.25" placeholder="Total marks" required /><Input name="durationMinutes" type="number" placeholder="Section timer optional" /><textarea name="instructions" placeholder="Section instructions" required className="focus-ring min-h-24 rounded-xl border p-3 md:col-span-4" /><label className="flex items-center gap-2 text-sm md:col-span-4"><input type="checkbox" name="canGoBackToPreviousQuestion" /> Allow moving back inside this section</label><Button disabled={create.isPending} className="md:col-span-4">Add section</Button></form>;
};

const QuestionBuilderForm = ({ test }: { test: any }) => {
  const client = useQueryClient();
  const masters = useQuery({ queryKey: ['mentor-masters'], queryFn: () => api<any>('/api/v1/mentor/masters') });
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const subjects = masters.data?.subjects ?? [];
  const selectedSubject = subjects.find((subject: any) => subject.id === subjectId) ?? subjects[0];
  const topics = selectedSubject?.topics ?? [];
  const selectedTopic = topics.find((topic: any) => topic.id === topicId) ?? topics[0];
  const subtopics = selectedTopic?.subtopics ?? [];
  const create = useMutation({ mutationFn: (body: any) => api('/api/v1/mentor/questions', { method: 'POST', body: JSON.stringify(body) }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['mentor-test', test.id] }); } });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const options = String(form.options ?? '').split('\n').map((value, index) => ({ id: String.fromCharCode(65 + index), text: value.trim() })).filter((option) => option.text);
    const correctAnswers = String(form.correctAnswers ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    create.mutate({ batchSectionId: form.batchSectionId, topicId: form.topicId, subtopicId: form.subtopicId, difficultyId: form.difficultyId, sequenceNumber: Number(form.sequenceNumber), questionType: form.questionType, question: form.question, options: form.questionType === 'INTEGER' ? null : options, correctAnswers, positiveMarks: Number(form.positiveMarks), negativeMarks: Number(form.negativeMarks), explanation: form.explanation, imageUrl: form.imageUrl || null, isActive: true });
    event.currentTarget.reset();
  };
  if (!test.sections.length) return <EmptyState compact icon={BookOpenCheck} title="Create a section first" description="Questions must belong to a batch test section." />;
  return <form onSubmit={submit} className="grid gap-3 md:grid-cols-4"><select name="batchSectionId" className="rounded-xl border px-3 py-2 text-sm" required>{test.sections.map((section: any) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><Input name="sequenceNumber" type="number" placeholder="Question no." required /><select name="questionType" className="rounded-xl border px-3 py-2 text-sm" required><option value="MCQ">Single correct</option><option value="MULTIPLE_CORRECT">Multiple correct</option><option value="INTEGER">Integer</option><option value="TRUE_FALSE">True / False</option></select><select name="difficultyId" className="rounded-xl border px-3 py-2 text-sm" required>{masters.data?.difficulties?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><select value={selectedSubject?.id ?? ''} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }} className="rounded-xl border px-3 py-2 text-sm">{subjects.map((subject: any) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select name="topicId" value={selectedTopic?.id ?? ''} onChange={(e) => setTopicId(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" required>{topics.map((topic: any) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select><select name="subtopicId" className="rounded-xl border px-3 py-2 text-sm" required>{subtopics.map((subtopic: any) => <option key={subtopic.id} value={subtopic.id}>{subtopic.name}</option>)}</select><Input name="imageUrl" placeholder="Image URL optional" /><textarea name="question" placeholder="Question text" required className="focus-ring min-h-24 rounded-xl border p-3 md:col-span-4" /><textarea name="options" placeholder="Options, one per line. They become A, B, C, D..." className="focus-ring min-h-24 rounded-xl border p-3 md:col-span-2" /><textarea name="explanation" placeholder="Explanation" required className="focus-ring min-h-24 rounded-xl border p-3 md:col-span-2" /><Input name="correctAnswers" placeholder="Correct answer ids/values, comma separated. Example: A,C or 42" required /><Input name="positiveMarks" type="number" step="0.25" placeholder="Positive marks" required /><Input name="negativeMarks" type="number" step="0.25" placeholder="Negative marks" defaultValue="0" required /><Button disabled={create.isPending}>Add question</Button></form>;
};

export const MentorAttemptAnalysisPage = () => {
  const { attemptId = '', batchId = '' } = useParams();
  const query = useQuery({ queryKey: ['mentor-attempt', attemptId], queryFn: () => api<{ analysis: AttemptAnalysis }>(`/api/v1/mentor/attempts/${attemptId}/analysis`) });
  if (query.isLoading) return <PageSkeleton />;
  const a = query.data?.analysis;
  if (!a) return <EmptyState icon={Trophy} title="Attempt unavailable" description="Could not load attempt." />;
  return <div className="space-y-6"><Back to={`${batchRoot(batchId)}/tests`}>Tests</Back><Hero eyebrow="Attempt analysis" title={a.test.name} text={a.test.batchName} stats={[['score', `${a.attempt.marksScored}/${a.attempt.totalMarks}`], ['accuracy', `${Math.round(a.attempt.accuracy)}%`], ['correct', a.attempt.correctAnswers], ['incorrect', a.attempt.incorrectAnswers]]} /><Card className="p-5"><h2 className="font-bold">Marks distribution</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={a.test.marksDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#7a9c32" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><Panel title="Section performance">{a.sections.map((s) => <Card key={s.id} className="p-4 shadow-none"><div className="flex justify-between"><p className="font-semibold">{s.name}</p><Badge>{s.marksScored}/{s.totalMarks}</Badge></div><p className="mt-2 text-sm text-stone-500">{Math.round(s.accuracy)}% · {s.correctAnswers}C/{s.incorrectAnswers}W/{s.unattemptedAnswers}U</p></Card>)}</Panel></div>;
};

function TaskForm(props: any) { return <ScheduleForm {...props} fields={['title', 'description', 'attachmentUrl', 'startDatetime', 'endDatetime']} />; }
function SessionForm(props: any) { return <ScheduleForm {...props} fields={['title', 'description', 'meetingLink', 'startDatetime', 'endDatetime']} />; }
function NoticeForm(props: any) { return <ScheduleForm {...props} fields={['title', 'description', 'attachmentUrl']} />; }
function ScheduleForm({ fields, initial, onSubmit, onCancel, pending }: any) {
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = Object.fromEntries(new FormData(e.currentTarget)); onSubmit(form); };
  return <Card className="p-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-2">{fields.map((field: string) => field === 'description' ? <textarea key={field} name={field} defaultValue={initial?.[field] ?? ''} placeholder="Description" required className="focus-ring min-h-28 rounded-xl border p-3 md:col-span-2" /> : <Input key={field} name={field} type={field.includes('Datetime') ? 'datetime-local' : 'text'} defaultValue={toInputValue(initial?.[field])} placeholder={field} required={!field.includes('Url')} />)}<div className="flex gap-2 md:col-span-2"><Button disabled={pending}>{initial ? 'Update' : 'Create'}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div></form></Card>;
}

const TestForm = ({ onCreated }: { onCreated: () => void }) => {
  const { batchId = '' } = useParams();
  const client = useQueryClient();
  const masters = useQuery({ queryKey: ['mentor-masters'], queryFn: () => api<any>('/api/v1/mentor/masters') });
  const create = useMutation({ mutationFn: (body: any) => api(`/api/v1/mentor/batches/${batchId}/tests`, { method: 'POST', body: JSON.stringify({ ...body, durationMinutes: Number(body.durationMinutes), canGoBackBetweenSections: false, isActive: true }) }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['mentor-tests', batchId] }); onCreated(); } });
  return <Card className="p-5"><form onSubmit={(e) => { e.preventDefault(); create.mutate(Object.fromEntries(new FormData(e.currentTarget))); }} className="grid gap-3 md:grid-cols-2"><Input name="name" placeholder="Test name" required /><Input name="durationMinutes" type="number" placeholder="Duration minutes" required /><select name="difficultyId" className="rounded-xl border px-3 py-2 text-sm" required>{masters.data?.difficulties.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><Input name="startDatetime" type="datetime-local" required /><Input name="endDatetime" type="datetime-local" required /><textarea name="description" placeholder="Description" required className="focus-ring min-h-24 rounded-xl border p-3 md:col-span-2" /><textarea name="instructions" placeholder="Instructions" required className="focus-ring min-h-24 rounded-xl border p-3 md:col-span-2" /><Button disabled={create.isPending}>Create test shell</Button></form><p className="mt-3 text-sm text-stone-500">Sections and questions can be added from the test detail/build workflow next; this creates the scheduled test shell now.</p></Card>;
};

const Header = ({ title, eyebrow, action }: { title: string; eyebrow: string; action?: JSX.Element }) => <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{eyebrow}</p><h1 className="text-3xl font-bold">{title}</h1></div>{action}</div>;
const Hero = ({ eyebrow, title, text, stats }: { eyebrow: string; title: string; text: string; stats?: Array<[string, string | number]> }) => <section className="rounded-4xl bg-moss-800 p-7 text-white shadow-card"><div className="flex flex-col justify-between gap-6 lg:flex-row"><div><Badge className="bg-white/12 text-lime">{eyebrow}</Badge><h1 className="mt-4 text-3xl font-semibold">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">{text}</p></div>{stats && <div className="grid grid-cols-2 gap-3">{stats.map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-moss-100/70">{label}</p></div>)}</div>}</div></section>;
const Nav = ({ to, icon: Icon, title, text }: { to: string; icon: typeof UsersRound; title: string; text: string }) => <Link to={to} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-card"><Icon className="text-moss-700" /><p className="mt-4 font-bold">{title}</p><p className="mt-1 text-sm text-stone-500">{text}</p></Link>;
const Panel = ({ title, to, children }: { title: string; to?: string; children: any }) => <Card className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{title}</h2>{to && <Link to={to} className="text-sm font-semibold text-moss-700">View all</Link>}</div><div className="space-y-3">{children}</div></Card>;
const TaskCard = ({ task }: { task: Task }) => <Card className="p-4 shadow-none"><div className="flex justify-between gap-3"><div><p className="font-semibold">{task.title}</p><p className="mt-1 text-sm text-stone-500">{task.description}</p><p className="mt-2 text-xs text-stone-400">Ends {formatDateTime(task.endDatetime)}</p></div><Badge className={phaseClass(task.phase)}>{phaseLabel(task.phase)}</Badge></div>{task.completionPercent != null && <p className="mt-2 text-xs font-semibold text-moss-700">{task.completionPercent}% completed</p>}</Card>;
const SessionCard = ({ session }: { session: Session }) => <Card className="p-4 shadow-none"><div className="flex justify-between gap-3"><div><p className="font-semibold">{session.title}</p><p className="mt-1 text-sm text-stone-500">{session.description}</p><p className="mt-2 text-xs text-stone-400">Ends {formatDateTime(session.endDatetime)}</p></div><Badge className={phaseClass(session.phase)}>{phaseLabel(session.phase)}</Badge></div><p className="mt-2 text-xs font-semibold text-moss-700">{session.attendanceCount} attended · {session.attendancePercent}%</p></Card>;
const NoticeCard = ({ notice }: { notice: Notice }) => <Card className="p-4 shadow-none"><p className="font-semibold">{notice.title}</p><p className="mt-1 text-sm text-stone-500">{notice.description}</p><p className="mt-2 text-xs text-stone-400">{formatDateTime(notice.createdAt)}</p></Card>;
const TestCard = ({ test, batchId }: { test: Test; batchId: string }) => <Link to={`${batchRoot(batchId)}/tests/${test.id}`}><Card className="p-5 transition hover:shadow-card"><div className="flex justify-between"><div><Badge className={phaseClass(test.phase)}>{phaseLabel(test.phase)}</Badge><h2 className="mt-3 font-bold">{test.name}</h2><p className="mt-1 text-sm text-stone-500">{test.description}</p></div><ArrowRight className="text-stone-300" /></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500"><span>{test.questionCount} questions</span><span>{test.totalMarks} marks</span><span>{test.attemptCount} attempts</span><span>{typeof test.difficulty === 'string' ? test.difficulty : test.difficulty.name}</span></div></Card></Link>;
const Mini = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-2xl bg-moss-50 p-3"><p className="font-bold text-moss-900">{value}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p></div>;
const Back = ({ to, children }: { to: string; children: string }) => <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700 hover:text-moss-900"><ChevronLeft size={16} />{children}</Link>;
const BatchBack = ({ batchId }: { batchId: string }) => <Back to={batchRoot(batchId)}>Batch dashboard</Back>;
const PageSkeleton = () => <div className="space-y-6"><Skeleton className="h-44 rounded-4xl" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div></div>;
const toInputValue = (value: unknown) => !value ? '' : typeof value === 'string' && value.includes('T') ? value.slice(0, 16) : String(value);
