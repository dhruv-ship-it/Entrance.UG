import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ArrowRight, BarChart3, Bookmark, CheckCircle2, ClipboardList, Clock3, Compass, Filter, Hash, HelpCircle, Layers, Layers3, Target, Trophy, UsersRound, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { cn, formatDateTime } from '../../lib/utils';

type ExamType = { id: string; name: string; description: string };
type MockExamType = { id: string; name: string; description: string };
type MockExamSummary = {
  id: string; name: string; description: string; instructionsPreview: string; durationMinutes: number; totalMarks: number; isFree: boolean; hasAccess: boolean; createdAt: string; difficulty: string; sectionCount: number; totalQuestions: number; averageScore: number; totalAttempts: number; canAttempt: boolean; isAttempted: boolean;
  attempt: { id: string; status: string; submittedAt: string | null; marksScored: number; accuracy: number } | null;
};
type CategoryAnalytics = {
  totalTests: number; attemptedTests: number; averageScore: number; averageAccuracy: number;
  trend: { index: number; name: string; score: number | null; rank: number | null; percentile: number | null }[];
  sections: { id: string; name: string; averageScore: number; averageAccuracy: number; trend: { index: number; examName: string; score: number | null }[] }[];
};
type Analytics = { totalAttempts: number; averageScore: number; averageAccuracy: number; averageTimeTaken: number; totalCorrectAnswers: number; totalIncorrectAnswers: number; totalUnattemptedAnswers: number };
type Analysis = {
  attempt: { id: string; submittedAt: string | null; timeTakenSeconds: number; totalMarks: number; marksScored: number; percentage: number; accuracy: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; rank: number | null; percentile: number | null };
  test: { id: string; name: string; analytics: Analytics | null; marksDistribution: { label: string; count: number }[]; sections: { id: string; name: string; analytics: Analytics | null }[] };
  sections: { id: string; name: string; marksScored: number; totalMarks?: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; accuracy: number; timeTakenSeconds: number; analytics: Analytics | null }[];
  filters: { topics: { id: string; name: string }[]; difficulties: { id: string; name: string }[]; sections: { id: string; name: string }[] };
  answers: Answer[];
};
type Answer = { id: string; sectionId: string; sectionName: string; question: string; options: unknown; selectedAnswers: unknown; correctAnswers: unknown; status: 'CORRECT' | 'INCORRECT' | 'PARTIALLY_CORRECT' | 'UNATTEMPTED'; marksAwarded: number; positiveMarks: number; negativeMarks: number; timeTakenSeconds: number; averageTimeTakenSeconds: number; bookmarked: boolean; explanation: string; imageUrl: string | null; comprehension: { title: string | null; passage: string } | null; difficulty: { id: string; name: string }; topic: { id: string; name: string; subject?: { id: string; name: string } }; subtopic: { id: string; name: string } };
type SwotItem = { title: string; description: string; metric: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' };
type Swot = { id: string; summary: string; strengths: SwotItem[]; weaknesses: SwotItem[]; opportunities: SwotItem[]; threats: SwotItem[]; generatedAt: string };
type BookmarkRow = { id: string; attemptId: string; test: { name: string; examType: { name: string }; mockExamType: { name: string } }; submittedAt: string | null; question: string; options: unknown; explanation: string; comprehension: { title: string | null; passage: string } | null; status: string; marksAwarded: number; selectedAnswers: unknown; correctAnswers: unknown; section: string; difficulty: string; topic: string; subtopic: string };

const statusOptions = ['CORRECT', 'INCORRECT', 'PARTIALLY_CORRECT', 'UNATTEMPTED'] as const;
const root = (studentId: string) => `/parent/students/${studentId}/mock-tests`;

export const ParentMockExamTypesPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mock-exam-types', studentId], queryFn: () => api<{ examTypes: ExamType[] }>(`/api/v1/parents/students/${studentId}/mock/exam-types`) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={ClipboardList} title="Could not load mock exams" description="Please refresh and try again." />;
  return (
    <div className="space-y-7">
      <Header title="Choose exam type" description="Parent read-only view of the student's mock-test ecosystem." crumbs={[{ label: 'Parent dashboard', to: '/parent/dashboard' }, { label: 'Mock tests' }]} />
      <Link to={`${root(studentId)}/bookmarks`} className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-moss-800 shadow-card"><Bookmark size={16} />Bookmarked questions</Link>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {query.data.examTypes.map((exam) => <Tile key={exam.id} to={`${root(studentId)}/${exam.id}`} icon={ClipboardList} title={exam.name} text={exam.description} cta="Browse categories" />)}
      </section>
    </div>
  );
};

export const ParentMockCategoriesPage = () => {
  const { studentId = '', examTypeId = '' } = useParams();
  const exams = useQuery({ queryKey: ['parent-mock-exam-types', studentId], queryFn: () => api<{ examTypes: ExamType[] }>(`/api/v1/parents/students/${studentId}/mock/exam-types`) });
  const categories = useQuery({ queryKey: ['parent-mock-categories', studentId], queryFn: () => api<{ mockExamTypes: MockExamType[] }>(`/api/v1/parents/students/${studentId}/mock/mock-exam-types`) });
  const selected = exams.data?.examTypes.find((item) => item.id === examTypeId);
  if (exams.isLoading || categories.isLoading) return <PageSkeleton />;
  if (!selected || categories.isError || !categories.data) return <EmptyState icon={Layers3} title="Could not load categories" description="The selected exam type may be unavailable." />;
  return (
    <div className="space-y-7">
      <Header title={`${selected.name} categories`} description="Pick a mock category to inspect tests and series-level progress." crumbs={[{ label: 'Mock tests', to: root(studentId) }, { label: selected.name }]} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.data.mockExamTypes.map((category) => <Tile key={category.id} to={`${root(studentId)}/${examTypeId}/${category.id}`} icon={Layers3} title={category.name} text={category.description} cta="View test series" />)}
      </section>
    </div>
  );
};

export const ParentMockSeriesPage = () => {
  const { studentId = '', examTypeId = '', mockExamTypeId = '' } = useParams();
  const examsList = useQuery({ queryKey: ['parent-mock-exams', studentId, examTypeId, mockExamTypeId], queryFn: () => api<{ exams: MockExamSummary[] }>(`/api/v1/parents/students/${studentId}/mock/exams?examTypeId=${examTypeId}&mockExamTypeId=${mockExamTypeId}`) });
  const analytics = useQuery({ queryKey: ['parent-mock-category-analytics', studentId, examTypeId, mockExamTypeId], queryFn: () => api<{ analytics: CategoryAnalytics }>(`/api/v1/parents/students/${studentId}/mock/analytics?examTypeId=${examTypeId}&mockExamTypeId=${mockExamTypeId}`).then((response) => response.analytics) });
  if (examsList.isLoading) return <PageSkeleton />;
  if (examsList.isError || !examsList.data) return <EmptyState icon={ClipboardList} title="Could not load mock series" description="Please refresh and try again." />;
  return (
    <div className="space-y-7">
      <Header title="Mock test series" description="View the student's tests, attempted status, and progression across this exam/category." crumbs={[{ label: 'Mock tests', to: root(studentId) }, { label: 'Series' }]} />
      {analytics.data && <SeriesAnalytics analytics={analytics.data} />}
      <section className="space-y-4">
        {examsList.data.exams.length ? examsList.data.exams.map((exam) => <ExamRow key={exam.id} exam={exam} studentId={studentId} />) : <EmptyState icon={ClipboardList} title="No tests available" description="No active tests have been configured here yet." />}
      </section>
    </div>
  );
};

export const ParentMockAttemptAnalysisPage = () => {
  const { studentId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mock-attempt-rich', studentId, attemptId], queryFn: () => api<{ analysis: Analysis }>(`/api/v1/parents/students/${studentId}/mock-attempts/${attemptId}`).then((response) => response.analysis) });
  const [sectionId, setSectionId] = useState('all');
  const analysis = query.data;
  const chartAnalytics = useMemo(() => !analysis ? null : sectionId === 'all' ? analysis.test.analytics : analysis.test.sections.find((section) => section.id === sectionId)?.analytics ?? null, [analysis, sectionId]);
  if (query.isLoading) return <Skeleton className="h-[720px]" />;
  if (!analysis) return <EmptyState icon={Trophy} title="Analysis unavailable" description="This submitted mock attempt could not be opened." />;
  const distribution = chartAnalytics ? [
    { name: 'Correct', value: chartAnalytics.totalCorrectAnswers, percent: percent(chartAnalytics.totalCorrectAnswers, chartAnalytics), color: '#166534' },
    { name: 'Incorrect', value: chartAnalytics.totalIncorrectAnswers, percent: percent(chartAnalytics.totalIncorrectAnswers, chartAnalytics), color: '#dc2626' },
    { name: 'Unattempted', value: chartAnalytics.totalUnattemptedAnswers, percent: percent(chartAnalytics.totalUnattemptedAnswers, chartAnalytics), color: '#a8a29e' },
  ] : [];
  return (
    <div className="space-y-7">
      <Header title={analysis.test.name} description="Read-only parent view of score, cohort comparison, topic strength and difficulty breakdown." crumbs={[{ label: 'Mock tests', to: root(studentId) }, { label: 'Analysis' }]} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Trophy} label="Score" value={`${analysis.attempt.marksScored}/${analysis.attempt.totalMarks}`} />
        <Metric icon={Target} label="Accuracy" value={`${analysis.attempt.accuracy}%`} />
        <Metric icon={CheckCircle2} label="Correct" value={analysis.attempt.correctAnswers} />
        <Metric icon={XCircle} label="Incorrect" value={analysis.attempt.incorrectAnswers} />
        <Metric icon={Layers} label="Rank" value={analysis.attempt.rank ? `#${analysis.attempt.rank}` : '—'} note={analysis.attempt.percentile ? `${analysis.attempt.percentile}%ile` : ''} />
      </section>
      <Card className="p-5"><div className="flex flex-wrap items-center gap-3"><Filter size={17} className="text-moss-700" /><span className="text-sm font-semibold text-stone-500">Chart scope</span><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{analysis.filters.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></div></Card>
      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5"><h2 className="font-bold">Marks distribution</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.test.marksDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#7a9c32" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Cohort answer mix</h2><Badge>{chartAnalytics?.totalAttempts ?? 0} attempts</Badge></div><div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="percent" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={4}>{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} /></PieChart></ResponsiveContainer></div><div className="self-center space-y-3">{distribution.map((entry) => <div key={entry.name} className="rounded-2xl bg-stone-50 p-3"><div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: entry.color }} /><p className="text-sm font-semibold">{entry.name}</p></div><p className="mt-1 text-2xl font-bold">{entry.percent}%</p><p className="text-xs text-stone-400">{entry.value} answers</p></div>)}</div></div></Card>
      </section>
      <TopicAnalysis answers={analysis.answers} sections={analysis.filters.sections} />
      <DifficultyAnalysis answers={analysis.answers} sections={analysis.filters.sections} />
      <section className="grid gap-5 lg:grid-cols-2">
        <ActionCard title="Open attempted answers" text="Detailed question review, filters, explanations and bookmarks." to={`${root(studentId)}/attempts/${attemptId}/review`} badge="Answer review" />
        <ActionCard title="See SWOT analysis" text="Strengths, weaknesses, opportunities and threats generated from this attempt." to={`${root(studentId)}/attempts/${attemptId}/swot`} badge="SWOT brief" accent />
      </section>
    </div>
  );
};

export const ParentMockAttemptReviewPage = () => {
  const { studentId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mock-attempt-rich', studentId, attemptId], queryFn: () => api<{ analysis: Analysis }>(`/api/v1/parents/students/${studentId}/mock-attempts/${attemptId}`).then((response) => response.analysis) });
  const [sectionId, setSectionId] = useState('all');
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [difficultyId, setDifficultyId] = useState('all');
  const [status, setStatus] = useState('all');
  const analysis = query.data;
  const filtered = useMemo(() => !analysis ? [] : analysis.answers.filter((answer) => (sectionId === 'all' || answer.sectionId === sectionId) && (!topicIds.length || topicIds.includes(answer.topic.id)) && (difficultyId === 'all' || answer.difficulty.id === difficultyId) && (status === 'all' || answer.status === status)), [analysis, sectionId, topicIds, difficultyId, status]);
  if (query.isLoading) return <Skeleton className="h-[720px]" />;
  if (!analysis) return <EmptyState icon={Trophy} title="Review unavailable" description="This submitted mock attempt could not be opened." />;
  return (
    <div className="space-y-7">
      <Header title={`${analysis.test.name} answer review`} description="Read-only question-by-question review." crumbs={[{ label: 'Mock tests', to: root(studentId) }, { label: 'Analysis', to: `${root(studentId)}/attempts/${attemptId}` }, { label: 'Review' }]} />
      <ReviewFilters analysis={analysis} sectionId={sectionId} setSectionId={setSectionId} difficultyId={difficultyId} setDifficultyId={setDifficultyId} status={status} setStatus={setStatus} topicIds={topicIds} setTopicIds={setTopicIds} />
      <QuestionReview answers={filtered} />
    </div>
  );
};

export const ParentMockSwotPage = () => {
  const { studentId = '', attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mock-swot', studentId, attemptId], queryFn: () => api<{ swot: Swot }>(`/api/v1/parents/students/${studentId}/mock-attempts/${attemptId}/swot`).then((response) => response.swot) });
  if (query.isLoading) return <Skeleton className="h-[620px]" />;
  if (!query.data) return <EmptyState icon={Compass} title="SWOT unavailable" description="This SWOT analysis could not be opened." />;
  const swot = query.data;
  return (
    <div className="space-y-7">
      <Header title="Personal SWOT analysis" description="Parent read-only view of the student's generated mock attempt SWOT." crumbs={[{ label: 'Mock tests', to: root(studentId) }, { label: 'SWOT' }]} />
      <Link to={`${root(studentId)}/attempts/${attemptId}`} className="inline-flex items-center gap-2 text-sm font-bold text-moss-700"><ArrowLeft size={16} />Back to analysis</Link>
      <Card className="bg-moss-800 p-7 text-white"><Badge className="bg-white/15 text-lime">Actionable diagnosis</Badge><h2 className="mt-4 text-3xl font-black">What this mock is telling you</h2><p className="mt-3 max-w-3xl leading-7 text-moss-50/90">{swot.summary}</p></Card>
      <section className="grid gap-5 xl:grid-cols-2">
        <SwotPanel title="Strengths" items={swot.strengths} className="border-emerald-200 bg-emerald-50" />
        <SwotPanel title="Weaknesses" items={swot.weaknesses} className="border-rose-200 bg-rose-50" />
        <SwotPanel title="Opportunities" items={swot.opportunities} className="border-sky-200 bg-sky-50" />
        <SwotPanel title="Threats" items={swot.threats} className="border-orange-200 bg-orange-50" />
      </section>
    </div>
  );
};

export const ParentMockBookmarksPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-mock-bookmarks', studentId], queryFn: () => api<{ bookmarks: BookmarkRow[] }>(`/api/v1/parents/students/${studentId}/mock/bookmarks`).then((response) => response.bookmarks) });
  if (query.isLoading) return <Skeleton className="h-[560px]" />;
  const rows = query.data ?? [];
  return (
    <div className="space-y-7">
      <Header title="Bookmarked mock questions" description="Questions the student bookmarked while reviewing submitted mocks." crumbs={[{ label: 'Mock tests', to: root(studentId) }, { label: 'Bookmarks' }]} />
      {rows.length ? <div className="space-y-4">{rows.map((row) => <Card key={row.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge className="bg-moss-100 text-moss-800"><Bookmark size={13} />Saved</Badge><h2 className="mt-3 line-clamp-2 font-bold">{row.question}</h2><p className="mt-2 text-sm text-stone-500">{row.test.name} · {row.section} · {row.topic} / {row.subtopic}</p></div><Link to={`${root(studentId)}/attempts/${row.attemptId}/review`} className="rounded-2xl bg-moss-800 px-4 py-2 text-sm font-bold text-white">Open review</Link></div><OptionReview options={row.options} selected={normalize(row.selectedAnswers)} correct={normalize(row.correctAnswers)} /><div className="mt-4 rounded-2xl bg-moss-50 p-4 text-sm leading-6 text-moss-900"><b>Explanation:</b> {row.explanation}</div></Card>)}</div> : <EmptyState icon={Bookmark} title="No bookmarked mock questions" description="Bookmarked questions will appear here once the student saves them from review." />}
    </div>
  );
};

const Header = ({ title, description, crumbs }: { title: string; description: string; crumbs: { label: string; to?: string }[] }) => <div className="space-y-4"><nav className="flex flex-wrap gap-2 text-sm">{crumbs.map((crumb, index) => <span key={`${crumb.label}-${index}`}>{crumb.to ? <Link to={crumb.to} className="font-semibold text-moss-700 hover:underline">{crumb.label}</Link> : <span className="font-semibold text-ink">{crumb.label}</span>}{index < crumbs.length - 1 && <span className="ml-2 text-stone-300">/</span>}</span>)}</nav><div><p className="eyebrow">Parent mock view</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{description}</p></div></div>;
const Tile = ({ to, icon: Icon, title, text, cta }: { to: string; icon: typeof ClipboardList; title: string; text: string; cta: string }) => <Link to={to} className="group focus-ring block rounded-3xl"><Card className="flex h-full flex-col p-6 transition group-hover:border-moss-200 group-hover:shadow-float"><div className="flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-moss-100 text-moss-800"><Icon size={20} /></div><ArrowRight size={18} className="text-stone-300 transition group-hover:text-moss-700" /></div><h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2><p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-stone-500">{text}</p><p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-moss-700">{cta}</p></Card></Link>;
const ExamRow = ({ exam, studentId }: { exam: MockExamSummary; studentId: string }) => <Card className="p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-ink">{exam.name}</h2>{exam.isFree && <Badge className="bg-lime/45 text-moss-900">Free</Badge>}{!exam.hasAccess && <Badge className="bg-stone-100 text-stone-600">Locked</Badge>}{exam.isAttempted && <Badge className="bg-moss-100 text-moss-800">Attempted</Badge>}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{exam.description}</p><div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-stone-500"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{exam.durationMinutes} min</span><span className="inline-flex items-center gap-1.5"><Hash size={14} />{exam.totalMarks} marks</span><span className="inline-flex items-center gap-1.5"><Layers size={14} />{exam.sectionCount} sections</span><span className="inline-flex items-center gap-1.5"><BarChart3 size={14} />{exam.totalQuestions} questions</span><span className="inline-flex items-center gap-1.5"><UsersRound size={14} />{exam.totalAttempts} attempted</span><span>Difficulty: {exam.difficulty}</span></div>{exam.attempt && <p className="mt-3 text-sm text-moss-800">Scored {exam.attempt.marksScored}/{exam.totalMarks} · {Math.round(exam.attempt.accuracy)}% accuracy{exam.attempt.submittedAt ? ` · ${formatDateTime(exam.attempt.submittedAt)}` : ''}</p>}</div>{exam.attempt ? <Link to={`${root(studentId)}/attempts/${exam.attempt.id}`} className="rounded-2xl bg-moss-800 px-5 py-3 text-sm font-bold text-white">View analysis</Link> : <Badge className="w-fit bg-stone-100 text-stone-600">Not attempted</Badge>}</div></Card>;
const SeriesAnalytics = ({ analytics }: { analytics: CategoryAnalytics }) => <Card className="overflow-hidden p-0"><div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]"><div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Student progression</p><h2 className="text-xl font-bold">Score trend across this mock series</h2></div><Badge className="bg-moss-50 text-moss-800">{analytics.attemptedTests}/{analytics.totalTests} attempted</Badge></div><div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="index" /><YAxis /><Tooltip /><Line type="monotone" dataKey="score" name="Score" stroke="#164331" strokeWidth={3} connectNulls /></LineChart></ResponsiveContainer></div></div><div className="grid gap-3"><Mini label="Avg score" value={analytics.averageScore} /><Mini label="Avg accuracy" value={`${analytics.averageAccuracy}%`} /><div className="rounded-3xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">Section signals</p><div className="mt-3 space-y-2">{analytics.sections.map((section) => <div key={section.id} className="flex items-center justify-between text-sm"><span>{section.name}</span><b>{section.averageScore}</b></div>)}</div></div></div></div></Card>;
const Mini = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-3xl bg-moss-50 p-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-moss-700">{label}</p><p className="mt-1 text-2xl font-bold text-moss-950">{value}</p></div>;
const Metric = ({ icon: Icon, label, value, note }: { icon: typeof Trophy; label: string; value: string | number; note?: string }) => <Card className="p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-moss-50 text-moss-800"><Icon size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-stone-400">{label}</p><p className="text-xl font-bold">{value}</p>{note && <p className="text-xs text-stone-500">{note}</p>}</div></div></Card>;
const ActionCard = ({ title, text, to, badge, accent = false }: { title: string; text: string; to: string; badge: string; accent?: boolean }) => <Card className="overflow-hidden p-0"><div className={cn('grid h-full gap-4 p-6 text-white md:grid-cols-[1fr_auto] md:items-center', accent ? 'bg-[linear-gradient(135deg,#123b31_0%,#1f5b45_52%,#8a5a18_100%)]' : 'bg-gradient-to-r from-moss-900 to-moss-700')}><div><Badge className="bg-white/15 text-lime">{badge}</Badge><h2 className="mt-3 text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-moss-100/80">{text}</p></div><Link to={to} className="inline-flex items-center justify-center rounded-2xl bg-lime px-5 py-3 text-sm font-bold text-moss-950 shadow-card hover:bg-lime/90">Open</Link></div></Card>;

const ReviewFilters = ({ analysis, sectionId, setSectionId, difficultyId, setDifficultyId, status, setStatus, topicIds, setTopicIds }: { analysis: Analysis; sectionId: string; setSectionId: (value: string) => void; difficultyId: string; setDifficultyId: (value: string) => void; status: string; setStatus: (value: string) => void; topicIds: string[]; setTopicIds: React.Dispatch<React.SetStateAction<string[]>> }) => <Card className="p-5"><div className="flex flex-wrap items-center gap-3"><Filter size={17} className="text-moss-700" /><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{analysis.filters.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={difficultyId} onChange={(event) => setDifficultyId(event.target.value)}><option value="all">All difficulty</option>{analysis.filters.difficulties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statusOptions.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select><div className="flex flex-wrap gap-2">{analysis.filters.topics.map((topic) => <button key={topic.id} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', topicIds.includes(topic.id) ? 'border-moss-700 bg-moss-700 text-white' : 'border-stone-200 bg-white text-stone-600')} onClick={() => setTopicIds((value) => value.includes(topic.id) ? value.filter((id) => id !== topic.id) : [...value, topic.id])}>{topic.name}</button>)}</div></div></Card>;
const QuestionReview = ({ answers }: { answers: Answer[] }) => <section className="space-y-4">{answers.map((answer, index) => <Card key={answer.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge className={statusClass(answer.status)}>{answer.status.replace('_', ' ')}</Badge><h3 className="mt-3 font-bold">Q{index + 1}. {answer.question}</h3></div>{answer.bookmarked && <Badge className="bg-lime/40 text-moss-900"><Bookmark size={13} />Bookmarked</Badge>}</div>{answer.comprehension && <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{answer.comprehension.passage}</div>}<OptionReview options={answer.options} selected={normalize(answer.selectedAnswers)} correct={normalize(answer.correctAnswers)} /><div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><Info label="Student answer" value={normalize(answer.selectedAnswers).join(', ') || 'Unattempted'} /><Info label="Correct answer" value={normalize(answer.correctAnswers).join(', ')} /><Info label="Marks" value={`${answer.marksAwarded} / +${answer.positiveMarks}`} /><Info label="Time" value={`${answer.timeTakenSeconds}s · avg ${answer.averageTimeTakenSeconds}s`} /></div><div className="mt-4 rounded-2xl bg-moss-50 p-4 text-sm leading-6 text-moss-900"><b>Explanation:</b> {answer.explanation}</div><p className="mt-3 text-xs text-stone-500">{answer.sectionName} · {answer.topic.subject?.name} / {answer.topic.name} / {answer.subtopic.name} · {answer.difficulty.name}</p></Card>)}</section>;
const TopicAnalysis = ({ answers, sections }: { answers: Answer[]; sections: { id: string; name: string }[] }) => { const [active, setActive] = useState(sections[0]?.id ?? 'all'); const scoped = active === 'all' ? answers : answers.filter((a) => a.sectionId === active); const rows = Object.values(scoped.reduce<Record<string, { topic: string; answers: (Answer & { number: number })[] }>>((acc, answer) => { acc[answer.topic.id] ??= { topic: answer.topic.name, answers: [] }; acc[answer.topic.id].answers.push({ ...answer, number: answers.findIndex((x) => x.id === answer.id) + 1 }); return acc; }, {})); return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Detailed topic analysis</h2><p className="mt-1 text-sm text-stone-500">Granular performance by concepts.</p></div><QuestionLegend /></div><div className="mt-5 flex flex-wrap gap-2">{sections.map((s) => <button key={s.id} className={cn('rounded-full border px-4 py-2 text-sm font-bold', active === s.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-stone-200 bg-white text-stone-700')} onClick={() => setActive(s.id)}>{s.name}</button>)}</div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b text-xs uppercase tracking-[.12em] text-stone-400"><th className="py-3">Topic</th><th className="py-3">Questions</th><th className="py-3">Summary</th></tr></thead><tbody>{rows.map((row) => { const summary = summarize(row.answers); return <tr key={row.topic} className="border-b border-stone-100"><td className="py-5 align-top text-lg font-bold">{row.topic}</td><td className="py-5"><div className="flex flex-wrap gap-2">{row.answers.map((answer) => <QuestionChip key={answer.id} answer={answer} number={answer.number} />)}</div></td><td className="py-5 text-sm font-semibold"><span className="text-emerald-600">{summary.correct} correct</span><span className="mx-2 text-stone-300">/</span><span className="text-red-500">{summary.incorrect} wrong</span><span className="mx-2 text-stone-300">/</span><span className="text-amber-500">{summary.unattempted} skipped</span></td></tr>; })}</tbody></table></div></Card>; };
const DifficultyAnalysis = ({ answers, sections }: { answers: Answer[]; sections: { id: string; name: string }[] }) => <Card className="overflow-hidden p-0"><div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Difficulty analysis</h2><p className="mt-1 text-sm text-stone-500">Performance across easy, medium and hard questions.</p></div><QuestionLegend /></div></div><div className="space-y-5 p-5 pt-0">{sections.map((section) => { const scoped = answers.filter((a) => a.sectionId === section.id); return <div key={section.id} className="overflow-hidden rounded-3xl border border-stone-200"><div className="bg-indigo-50 px-5 py-4"><h3 className="font-bold text-indigo-950">{section.name} <span className="text-sm font-medium text-stone-500">{scoped.length}/{answers.length} questions</span></h3></div><div className="grid divide-y bg-white md:grid-cols-3 md:divide-x md:divide-y-0">{['Hard', 'Medium', 'Easy'].map((level) => { const items = scoped.filter((a) => a.difficulty.name.toLowerCase() === level.toLowerCase()); return <div key={level} className="p-5"><Badge className={difficultyBadge(level)}>{level}</Badge><div className="mt-4 flex flex-wrap gap-2">{items.length ? items.map((answer) => <QuestionChip key={answer.id} answer={answer} number={answers.findIndex((x) => x.id === answer.id) + 1} />) : <p className="text-sm text-stone-400">No questions of this difficulty</p>}</div></div>; })}</div></div>; })}</div></Card>;
const SwotPanel = ({ title, items, className }: { title: string; items: SwotItem[]; className: string }) => <Card className={cn('border p-5', className)}><h2 className="text-xl font-black">{title}</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={`${item.title}-${item.metric}`} className="rounded-3xl bg-white/90 p-4"><div className="flex justify-between gap-3"><h3 className="font-black">{item.title}</h3><Badge>{item.priority}</Badge></div><p className="mt-1 text-sm leading-6 text-stone-600">{item.description}</p><p className="mt-3 inline-flex rounded-full bg-stone-950 px-3 py-1 text-xs font-bold text-white">{item.metric}</p></div>)}</div></Card>;
const QuestionLegend = () => <div className="flex flex-wrap gap-4 text-xs font-semibold text-stone-500"><span className="flex items-center gap-2"><span className="size-3 rounded-full bg-emerald-500" />Correct</span><span className="flex items-center gap-2"><span className="size-3 rounded-full bg-red-500" />Wrong</span><span className="flex items-center gap-2"><span className="size-3 rounded-full bg-amber-500" />Skipped</span></div>;
const QuestionChip = ({ answer, number }: { answer: Answer; number: number }) => <span className={cn('rounded-lg px-3 py-2 text-xs font-black', answer.status === 'CORRECT' ? 'bg-emerald-100 text-emerald-700' : answer.status === 'UNATTEMPTED' ? 'border border-dashed border-amber-400 bg-white text-amber-600' : 'bg-red-100 text-red-600')}>Q{number}</span>;
const difficultyBadge = (level: string) => level === 'Hard' ? 'bg-red-100 text-red-700' : level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
const Info = ({ label, value }: { label: string; value: string }) => <div className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-400">{label}</p><p className="font-semibold text-ink">{value}</p></div>;
const statusClass = (status: string) => status === 'CORRECT' ? 'bg-moss-100 text-moss-800' : status === 'UNATTEMPTED' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-700';
const normalize = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const normalizeOptions = (value: unknown) => Array.isArray(value) ? value.map((item, index) => typeof item === 'string' ? { value: String.fromCharCode(65 + index), label: item } : { value: String((item as { id?: string; value?: string }).id ?? (item as { value?: string }).value ?? String.fromCharCode(65 + index)), label: String((item as { text?: string; label?: string }).text ?? (item as { label?: string }).label ?? JSON.stringify(item)) }) : [];
const OptionReview = ({ options, selected, correct }: { options: unknown; selected: string[]; correct: string[] }) => <div className="mt-4 grid gap-2 md:grid-cols-2">{normalizeOptions(options).map((option) => <div key={option.value} className={cn('rounded-2xl border p-3 text-sm', correct.includes(option.value) ? 'border-moss-300 bg-moss-50' : selected.includes(option.value) ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-white')}><b>{option.value}.</b> {option.label}</div>)}</div>;
const percent = (value: number, analytics: Analytics) => { const total = analytics.totalCorrectAnswers + analytics.totalIncorrectAnswers + analytics.totalUnattemptedAnswers; return total ? Number(((value / total) * 100).toFixed(1)) : 0; };
const summarize = (answers: Pick<Answer, 'marksAwarded' | 'status'>[]) => ({ score: Number(answers.reduce((sum, answer) => sum + answer.marksAwarded, 0).toFixed(2)), correct: answers.filter((answer) => answer.status === 'CORRECT').length, incorrect: answers.filter((answer) => answer.status === 'INCORRECT' || answer.status === 'PARTIALLY_CORRECT').length, unattempted: answers.filter((answer) => answer.status === 'UNATTEMPTED').length });
const PageSkeleton = () => <div className="space-y-7"><Skeleton className="h-28 w-full max-w-2xl" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-52" />)}</div></div>;
