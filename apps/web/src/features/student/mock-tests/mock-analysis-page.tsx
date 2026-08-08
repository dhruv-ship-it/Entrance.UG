import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bookmark, CheckCircle2, ChevronLeft, Clock3, Filter, HelpCircle, Layers, Target, Trophy, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { MockTestsHeader } from './mock-tests-nav';

type Analysis = {
  attempt: { id: string; submittedAt: string | null; timeTakenSeconds: number; totalMarks: number; marksScored: number; percentage: number; accuracy: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; rank: number | null; percentile: number | null };
  test: { id: string; name: string; analytics: Analytics | null; marksDistribution: { label: string; count: number }[]; sections: { id: string; name: string; analytics: Analytics | null }[] };
  sections: { id: string; name: string; marksScored: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; accuracy: number; timeTakenSeconds: number; analytics: Analytics | null }[];
  filters: { topics: { id: string; name: string }[]; difficulties: { id: string; name: string }[]; sections: { id: string; name: string }[] };
  answers: Answer[];
};
type Analytics = { totalAttempts: number; averageScore: number; averageAccuracy: number; averageTimeTaken: number; totalCorrectAnswers: number; totalIncorrectAnswers: number; totalUnattemptedAnswers: number };
type Answer = { id: string; sectionId: string; sectionName: string; question: string; options: unknown; selectedAnswers: unknown; correctAnswers: unknown; status: 'CORRECT' | 'INCORRECT' | 'PARTIALLY_CORRECT' | 'UNATTEMPTED'; marksAwarded: number; positiveMarks: number; negativeMarks: number; timeTakenSeconds: number; averageTimeTakenSeconds: number; bookmarked: boolean; explanation: string; imageUrl: string | null; comprehension: { title: string | null; passage: string } | null; difficulty: { id: string; name: string }; topic: { id: string; name: string; subject?: { id: string; name: string } }; subtopic: { id: string; name: string } };

const statusOptions = ['CORRECT', 'INCORRECT', 'PARTIALLY_CORRECT', 'UNATTEMPTED'] as const;

export const MockAttemptAnalysisPage = () => {
  const { attemptId = '' } = useParams();
  const query = useQuery({ queryKey: ['mock-analysis', attemptId], queryFn: () => api<{ analysis: Analysis }>(`/api/v1/mock-tests/attempts/${attemptId}/analysis`).then((response) => response.analysis) });
  const [sectionId, setSectionId] = useState('all');
  const analysis = query.data;
  const chartAnalytics = useMemo(() => {
    if (!analysis) return null;
    if (sectionId === 'all') return analysis.test.analytics;
    return analysis.test.sections.find((section) => section.id === sectionId)?.analytics ?? null;
  }, [analysis, sectionId]);
  const sectionAttempt = analysis?.sections.find((section) => section.id === sectionId);

  if (query.isLoading) return <Skeleton className="h-[720px]" />;
  if (!analysis) return <EmptyState icon={Trophy} title="Analysis unavailable" description="This submitted mock attempt could not be opened." />;

  const distribution = chartAnalytics ? [
    { name: 'Correct', value: chartAnalytics.totalCorrectAnswers, percent: percent(chartAnalytics.totalCorrectAnswers, chartAnalytics), color: '#166534' },
    { name: 'Incorrect', value: chartAnalytics.totalIncorrectAnswers, percent: percent(chartAnalytics.totalIncorrectAnswers, chartAnalytics), color: '#dc2626' },
    { name: 'Unattempted', value: chartAnalytics.totalUnattemptedAnswers, percent: percent(chartAnalytics.totalUnattemptedAnswers, chartAnalytics), color: '#a8a29e' },
  ] : [];

  return (
    <div className="space-y-7">
      <MockTestsHeader eyebrow="Mock analysis" title={analysis.test.name} description="Study your score, cohort comparison, topic strength and difficulty breakdown." crumbs={[{ label: 'Mock tests', to: '/student/mock-tests' }, { label: analysis.test.name }]} />
      <Link to="/student/mock-tests" className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700"><ChevronLeft size={16} />Back to mock tests</Link>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Trophy} label="Score" value={`${analysis.attempt.marksScored}/${analysis.attempt.totalMarks}`} />
        <Metric icon={Target} label="Accuracy" value={`${analysis.attempt.accuracy}%`} />
        <Metric icon={CheckCircle2} label="Correct" value={analysis.attempt.correctAnswers} />
        <Metric icon={XCircle} label="Incorrect" value={analysis.attempt.incorrectAnswers} />
        <Metric icon={Layers} label="Rank" value={analysis.attempt.rank ? `#${analysis.attempt.rank}` : '—'} note={analysis.attempt.percentile ? `${analysis.attempt.percentile}%ile` : ''} />
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={17} className="text-moss-700" />
          <span className="text-sm font-semibold text-stone-500">Chart scope</span>
          <select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{analysis.filters.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Marks distribution</h2><Badge>{sectionId === 'all' ? 'Entire test' : sectionAttempt?.name}</Badge></div>
          <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.test.marksDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#7a9c32" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Cohort answer mix</h2><Badge>{chartAnalytics?.totalAttempts ?? 0} attempts</Badge></div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="percent" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={4}>{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} /></PieChart></ResponsiveContainer></div>
            <div className="self-center space-y-3">{distribution.map((entry) => <div key={entry.name} className="rounded-2xl bg-stone-50 p-3"><div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: entry.color }} /><p className="text-sm font-semibold">{entry.name}</p></div><p className="mt-1 text-2xl font-bold">{entry.percent}%</p><p className="text-xs text-stone-400">{entry.value} answers</p></div>)}</div>
          </div>
        </Card>
      </section>

      <MockTopicAnalysis answers={analysis.answers} sections={analysis.filters.sections} />
      <MockDifficultyAnalysis answers={analysis.answers} sections={analysis.filters.sections} />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-4 bg-gradient-to-r from-moss-900 to-moss-700 p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Badge className="bg-white/15 text-lime">Answer review</Badge>
            <h2 className="mt-3 text-2xl font-bold">Open your attempted answers</h2>
            <p className="mt-1 text-sm text-moss-100/80">Detailed question review, filters, explanations and bookmarks are now on a separate page so this analysis stays clean.</p>
          </div>
          <Link to={`/student/mock-tests/attempts/${attemptId}/review`} className="inline-flex items-center justify-center rounded-2xl bg-lime px-5 py-3 text-sm font-bold text-moss-950 shadow-card hover:bg-lime/90">
            View attempted answers
          </Link>
        </div>
      </Card>
    </div>
  );
};

export const MockAttemptReviewPage = () => {
  const { attemptId = '' } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mock-analysis', attemptId], queryFn: () => api<{ analysis: Analysis }>(`/api/v1/mock-tests/attempts/${attemptId}/analysis`).then((response) => response.analysis) });
  const [sectionId, setSectionId] = useState('all');
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [difficultyId, setDifficultyId] = useState('all');
  const [status, setStatus] = useState('all');
  const bookmark = useMutation({
    mutationFn: ({ id, bookmarked }: { id: string; bookmarked: boolean }) => api(`/api/v1/mock-tests/attempt-answers/${id}/bookmark`, { method: 'PATCH', body: JSON.stringify({ bookmarked }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mock-analysis', attemptId] }),
  });
  const analysis = query.data;
  const filteredAnswers = useMemo(() => {
    if (!analysis) return [];
    return analysis.answers.filter((answer) => {
      if (sectionId !== 'all' && answer.sectionId !== sectionId) return false;
      if (topicIds.length && !topicIds.includes(answer.topic.id)) return false;
      if (difficultyId !== 'all' && answer.difficulty.id !== difficultyId) return false;
      if (status !== 'all' && answer.status !== status) return false;
      return true;
    });
  }, [analysis, sectionId, topicIds, difficultyId, status]);
  const filteredSummary = summarize(filteredAnswers);

  if (query.isLoading) return <Skeleton className="h-[720px]" />;
  if (!analysis) return <EmptyState icon={Trophy} title="Review unavailable" description="This submitted mock attempt could not be opened." />;

  return (
    <div className="space-y-7">
      <MockTestsHeader eyebrow="Answer review" title={analysis.test.name} description="Question-by-question review with explanations, filters and bookmark controls." crumbs={[{ label: 'Mock tests', to: '/student/mock-tests' }, { label: 'Analysis', to: `/student/mock-tests/attempts/${attemptId}/analysis` }, { label: 'Attempted answers' }]} />
      <Link to={`/student/mock-tests/attempts/${attemptId}/analysis`} className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700"><ChevronLeft size={16} />Back to analysis</Link>
      <ReviewFilters analysis={analysis} sectionId={sectionId} setSectionId={setSectionId} difficultyId={difficultyId} setDifficultyId={setDifficultyId} status={status} setStatus={setStatus} topicIds={topicIds} setTopicIds={setTopicIds} filteredSummary={filteredSummary} />
      <QuestionReview answers={filteredAnswers} bookmarkPending={bookmark.isPending} onBookmark={(id, bookmarked) => bookmark.mutate({ id, bookmarked })} />
    </div>
  );
};

const MockTopicAnalysis = ({ answers, sections }: { answers: Answer[]; sections: { id: string; name: string }[] }) => {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? 'all');
  const scoped = activeSection === 'all' ? answers : answers.filter((answer) => answer.sectionId === activeSection);
  const rows = Object.values(scoped.reduce<Record<string, { topic: string; answers: (Answer & { number: number })[] }>>((acc, answer) => {
    acc[answer.topic.id] ??= { topic: answer.topic.name, answers: [] };
    acc[answer.topic.id].answers.push({ ...answer, number: answers.findIndex((item) => item.id === answer.id) + 1 });
    return acc;
  }, {}));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Detailed topic analysis</h2><p className="mt-1 text-sm text-stone-500">Granular performance by concepts to pinpoint improvement areas.</p></div><QuestionLegend /></div>
      <div className="mt-5 flex flex-wrap gap-2">
        {sections.map((section) => <button key={section.id} className={cn('rounded-full border px-4 py-2 text-sm font-bold', activeSection === section.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-stone-200 bg-white text-stone-700')} onClick={() => setActiveSection(section.id)}>{section.name}</button>)}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead><tr className="border-b text-xs uppercase tracking-[.12em] text-stone-400"><th className="py-3">Topic</th><th className="py-3">Attempted questions</th><th className="py-3">Summary</th></tr></thead>
          <tbody>{rows.map((row) => {
            const summary = summarize(row.answers);
            return <tr key={row.topic} className="border-b border-stone-100"><td className="py-5 align-top text-lg font-bold">{row.topic}</td><td className="py-5"><div className="flex flex-wrap gap-2">{row.answers.map((answer) => <QuestionChip key={answer.id} answer={answer} number={answer.number} />)}</div></td><td className="py-5 text-sm font-semibold"><span className="text-emerald-600">{summary.correct} correct</span><span className="mx-2 text-stone-300">/</span><span className="text-red-500">{summary.incorrect} wrong</span><span className="mx-2 text-stone-300">/</span><span className="text-amber-500">{summary.unattempted} skipped</span></td></tr>;
          })}</tbody>
        </table>
      </div>
    </Card>
  );
};

const MockDifficultyAnalysis = ({ answers, sections }: { answers: Answer[]; sections: { id: string; name: string }[] }) => (
  <Card className="overflow-hidden p-0">
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Difficulty analysis</h2><p className="mt-1 text-sm text-stone-500">See how performance changed across easy, medium and hard questions.</p></div><QuestionLegend /></div>
    </div>
    <div className="space-y-5 p-5 pt-0">
      {sections.map((section) => {
        const sectionAnswers = answers.filter((answer) => answer.sectionId === section.id);
        return (
          <div key={section.id} className="overflow-hidden rounded-3xl border border-stone-200">
            <div className="bg-indigo-50 px-5 py-4"><h3 className="font-bold text-indigo-950">{section.name} <span className="text-sm font-medium text-stone-500">{sectionAnswers.length}/{answers.length} questions</span></h3></div>
            <div className="grid divide-y bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
              {['Hard', 'Medium', 'Easy'].map((level) => {
                const items = sectionAnswers.filter((answer) => answer.difficulty.name.toLowerCase() === level.toLowerCase());
                return <div key={level} className="p-5"><Badge className={difficultyBadge(level)}>{level}</Badge><div className="mt-4 flex flex-wrap gap-2">{items.length ? items.map((answer) => <QuestionChip key={answer.id} answer={answer} number={answers.findIndex((item) => item.id === answer.id) + 1} />) : <p className="text-sm text-stone-400">No questions of this difficulty</p>}</div></div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);

const ReviewFilters = ({ analysis, sectionId, setSectionId, difficultyId, setDifficultyId, status, setStatus, topicIds, setTopicIds, filteredSummary }: {
  analysis: Analysis; sectionId: string; setSectionId: (value: string) => void; difficultyId: string; setDifficultyId: (value: string) => void; status: string; setStatus: (value: string) => void; topicIds: string[]; setTopicIds: React.Dispatch<React.SetStateAction<string[]>>; filteredSummary: ReturnType<typeof summarize>;
}) => (
  <Card className="p-5">
    <div className="flex flex-wrap items-center gap-3">
      <Filter size={17} className="text-moss-700" />
      <select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{analysis.filters.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select>
      <select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={difficultyId} onChange={(event) => setDifficultyId(event.target.value)}><option value="all">All difficulty</option>{analysis.filters.difficulties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statusOptions.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select>
      <div className="flex flex-wrap gap-2">{analysis.filters.topics.map((topic) => <button key={topic.id} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', topicIds.includes(topic.id) ? 'border-moss-700 bg-moss-700 text-white' : 'border-stone-200 bg-white text-stone-600')} onClick={() => setTopicIds((value) => value.includes(topic.id) ? value.filter((id) => id !== topic.id) : [...value, topic.id])}>{topic.name}</button>)}</div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-4">
      <Metric compact icon={Trophy} label="Filtered score" value={filteredSummary.score} />
      <Metric compact icon={CheckCircle2} label="Correct" value={filteredSummary.correct} />
      <Metric compact icon={XCircle} label="Incorrect" value={filteredSummary.incorrect} />
      <Metric compact icon={HelpCircle} label="Unattempted" value={filteredSummary.unattempted} />
    </div>
  </Card>
);

const QuestionReview = ({ answers, bookmarkPending, onBookmark }: { answers: Answer[]; bookmarkPending: boolean; onBookmark: (id: string, bookmarked: boolean) => void }) => (
  <section className="space-y-4">
    {answers.map((answer, index) => (
      <Card key={answer.id} className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><Badge className={statusClass(answer.status)}>{answer.status.replace('_', ' ')}</Badge><h3 className="mt-3 font-bold">Q{index + 1}. {answer.question}</h3></div>
          <Button size="sm" variant={answer.bookmarked ? 'secondary' : 'outline'} disabled={bookmarkPending} onClick={() => onBookmark(answer.id, !answer.bookmarked)}><Bookmark size={15} />{answer.bookmarked ? 'Bookmarked' : 'Bookmark'}</Button>
        </div>
        {answer.comprehension && <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{answer.comprehension.passage}</div>}
        {answer.imageUrl && <img src={answer.imageUrl} alt="" className="mt-4 max-h-72 rounded-2xl object-contain" />}
        <OptionReview options={answer.options} selected={normalize(answer.selectedAnswers)} correct={normalize(answer.correctAnswers)} />
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <Info label="Your answer" value={normalize(answer.selectedAnswers).join(', ') || 'Unattempted'} />
          <Info label="Correct answer" value={normalize(answer.correctAnswers).join(', ')} />
          <Info label="Marks" value={`${answer.marksAwarded} / +${answer.positiveMarks}`} />
          <Info label="Time" value={`${answer.timeTakenSeconds}s · avg ${answer.averageTimeTakenSeconds}s`} />
        </div>
        <div className="mt-4 rounded-2xl bg-moss-50 p-4 text-sm leading-6 text-moss-900"><b>Explanation:</b> {answer.explanation}</div>
        <p className="mt-3 text-xs text-stone-500">{answer.sectionName} · {answer.topic.subject?.name} / {answer.topic.name} / {answer.subtopic.name} · {answer.difficulty.name}</p>
      </Card>
    ))}
  </section>
);

const QuestionLegend = () => <div className="flex flex-wrap gap-4 text-xs font-semibold text-stone-500"><span className="flex items-center gap-2"><span className="size-3 rounded-full bg-emerald-500" />Correct</span><span className="flex items-center gap-2"><span className="size-3 rounded-full bg-red-500" />Wrong</span><span className="flex items-center gap-2"><span className="size-3 rounded-full bg-amber-500" />Skipped</span></div>;
const QuestionChip = ({ answer, number }: { answer: Answer; number: number }) => <span className={cn('rounded-lg px-3 py-2 text-xs font-black', answer.status === 'CORRECT' ? 'bg-emerald-100 text-emerald-700' : answer.status === 'UNATTEMPTED' ? 'border border-dashed border-amber-400 bg-white text-amber-600' : 'bg-red-100 text-red-600')}>Q{number}</span>;
const difficultyBadge = (level: string) => level === 'Hard' ? 'bg-red-100 text-red-700' : level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
const Metric = ({ icon: Icon, label, value, note, compact = false }: { icon: typeof Trophy; label: string; value: string | number; note?: string; compact?: boolean }) => <Card className={cn('p-4', compact && 'bg-stone-50 shadow-none')}><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-moss-50 text-moss-800"><Icon size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-stone-400">{label}</p><p className="text-xl font-bold">{value}</p>{note && <p className="text-xs text-stone-500">{note}</p>}</div></div></Card>;
const Info = ({ label, value }: { label: string; value: string }) => <div className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-400">{label}</p><p className="font-semibold text-ink">{value}</p></div>;
const normalize = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const percent = (value: number, analytics: Analytics) => {
  const total = analytics.totalCorrectAnswers + analytics.totalIncorrectAnswers + analytics.totalUnattemptedAnswers;
  return total ? Number(((value / total) * 100).toFixed(1)) : 0;
};
const summarize = (answers: Pick<Answer, 'marksAwarded' | 'status'>[]) => ({ score: Number(answers.reduce((sum, answer) => sum + answer.marksAwarded, 0).toFixed(2)), correct: answers.filter((answer) => answer.status === 'CORRECT').length, incorrect: answers.filter((answer) => answer.status === 'INCORRECT' || answer.status === 'PARTIALLY_CORRECT').length, unattempted: answers.filter((answer) => answer.status === 'UNATTEMPTED').length });
const statusClass = (status: string) => status === 'CORRECT' ? 'bg-moss-100 text-moss-800' : status === 'UNATTEMPTED' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-700';
const OptionReview = ({ options, selected, correct }: { options: unknown; selected: string[]; correct: string[] }) => <div className="mt-4 grid gap-2">{normalizeOptions(options).map((option) => <div key={option.value} className={cn('rounded-2xl border p-3 text-sm', correct.includes(option.value) ? 'border-moss-300 bg-moss-50' : selected.includes(option.value) ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-white')}><b>{option.value}.</b> {option.label}</div>)}</div>;
const normalizeOptions = (value: unknown) => Array.isArray(value) ? value.map((item, index) => typeof item === 'string' ? { value: String.fromCharCode(65 + index), label: item } : { value: String((item as { id?: string; value?: string }).id ?? (item as { value?: string }).value ?? String.fromCharCode(65 + index)), label: String((item as { text?: string; label?: string }).text ?? (item as { label?: string }).label ?? JSON.stringify(item)) }) : [];
