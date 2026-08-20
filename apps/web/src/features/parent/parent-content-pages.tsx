import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  BookOpenCheck,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  FileText,
  Globe2,
  Layers3,
  Lock,
  PlayCircle,
  StickyNote,
  Trophy,
  Video,
  XCircle,
} from 'lucide-react';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { cn, formatDateTime } from '../../lib/utils';
import type { ContentAttempt, ContentSubtopic, ContentSubject, ContentTopic, ContentTreeResponse, LearningContent } from '../student/content/types';

type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';
type AnswerStatus = 'CORRECT' | 'INCORRECT' | 'PARTIALLY_CORRECT' | 'UNATTEMPTED';
type ContentAttemptDetail = {
  id: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  timeTakenSeconds: number;
  totalMarks: number;
  marksScored: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unattemptedAnswers: number;
  accuracy: number;
  test: { id: string; name: string; description: string; instructions: string; durationMinutes: number; totalMarks: number; difficulty: string; topic: string; subject: string };
  sections: Array<{ id: string; name: string; totalMarks: number; marksScored: number; accuracy: number; timeTakenSeconds: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number }>;
  answers: Array<{ id: string; questionId: string; sectionId: string; sectionName: string; sequenceNumber: number; questionType: string; question: string; options: unknown; selectedAnswers: unknown; correctAnswers: unknown; status: AnswerStatus; marksAwarded: number; positiveMarks: number; negativeMarks: number; timeTakenSeconds: number; visited: boolean; bookmarked: boolean; markedForReview: boolean; answeredAt: string | null; explanation: string; imageUrl: string | null; difficulty: string; topic: string; subtopic: string; comprehension: { id: string; title: string | null; passage: string } | null }>;
};
type ContentBookmarkAnswer = ContentAttemptDetail['answers'][number] & { attemptId: string; test: { id: string; name: string; topic: string; subject: string; submittedAt: string | null } };

const root = (studentId: string) => `/parent/students/${studentId}/content`;
const percent = (done: number, total: number) => total ? Math.round((done / total) * 100) : 0;
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
const contentVisual = { YOUTUBE: Video, PDF: FileText, DOCUMENT: BookOpenCheck, WEBSITE: Globe2 };

export const ParentContentPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-content-tree', studentId], queryFn: () => api<ContentTreeResponse>(`/api/v1/parents/students/${studentId}/content`) });
  if (query.isLoading) return <ContentSkeleton />;
  if (query.isError || !query.data) return <EmptyState icon={BookOpenCheck} title="Content progress unavailable" description="Unable to load content progress." />;
  if (!query.data.subjects.length) return <EmptyState icon={BookOpenCheck} title="Learning library is on its way" description="There are no active learning resources yet." />;
  return (
    <div className="space-y-7">
      <Back to={`/parent/students/${studentId}`}>Student overview</Back>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Learning library</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Choose a subject</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Parent read-only view of completed lessons, pending content, notes status and topic-test progress.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ variant: 'outline' })} to={`${root(studentId)}/bookmarks`}><Bookmark size={16} />Bookmarks</Link>
          <Link className={buttonVariants({ variant: 'outline' })} to={`${root(studentId)}/attempts`}><Trophy size={16} />Attempted tests</Link>
        </div>
      </header>
      <SubjectLibrary studentId={studentId} subjects={query.data.subjects} />
    </div>
  );
};

export const ParentContentSubjectPage = () => {
  const { studentId = '', subjectId = '' } = useParams();
  const [topicId, setTopicId] = useState<string | undefined>();
  const [tab, setTab] = useState<'lessons' | 'tests'>('lessons');
  const query = useQuery({ queryKey: ['parent-content-tree', studentId], queryFn: () => api<ContentTreeResponse>(`/api/v1/parents/students/${studentId}/content`) });
  if (query.isLoading) return <ContentSkeleton />;
  if (!query.data) return <EmptyState icon={BookOpenCheck} title="Content unavailable" description="Unable to load learning content." />;
  const subject = query.data.subjects.find((item) => item.id === subjectId) ?? query.data.subjects[0];
  const topic = subject?.topics.find((item) => item.id === topicId) ?? subject?.topics[0];
  if (!subject || !topic) return <EmptyState icon={Layers3} title="No topics available" description="Resources will appear here when this subject is published." />;
  return (
    <div className="space-y-7">
      <Back to={root(studentId)}>All subjects</Back>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Learning library</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{subject.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Select a topic to inspect subtopics, content completion and topic tests.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link className={buttonVariants({ variant: 'outline' })} to={`${root(studentId)}/bookmarks`}><Bookmark size={16} />Bookmarks</Link><Link className={buttonVariants({ variant: 'outline' })} to={`${root(studentId)}/attempts`}><Trophy size={16} />Attempted tests</Link></div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-stone-400">{subject.name} topics</p></div>
          <div className="p-2">{subject.topics.map((item) => <button key={item.id} onClick={() => { setTopicId(item.id); setTab('lessons'); }} className={cn('w-full rounded-2xl px-3 py-3 text-left transition', item.id === topic.id ? 'bg-moss-800 text-white shadow-sm' : 'text-stone-600 hover:bg-moss-50')}><span className="block text-sm font-semibold">{item.name}</span><span className={cn('mt-1 block text-xs', item.id === topic.id ? 'text-moss-100/70' : 'text-stone-400')}>{percent(item.completedContentCount, item.totalContentCount)}% complete · {item.totalContentCount} lessons</span><div className={cn('mt-2 h-1 overflow-hidden rounded-full', item.id === topic.id ? 'bg-white/15' : 'bg-stone-100')}><div className="h-full rounded-full bg-lime" style={{ width: `${percent(item.completedContentCount, item.totalContentCount)}%` }} /></div></button>)}</div>
        </Card>
        <div className="min-w-0 space-y-5">
          <div className="flex items-center gap-2 text-sm text-stone-500"><span>{subject.name}</span><ChevronRight size={15} /><span className="font-medium text-ink">{topic.name}</span></div>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-moss-700">Current topic</p><h2 className="mt-1 text-2xl font-bold text-ink">{topic.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{topic.description}</p></div>
              <div className="rounded-2xl bg-moss-50 px-4 py-3 sm:min-w-36"><p className="text-xl font-bold text-moss-900">{percent(topic.completedContentCount, topic.totalContentCount)}%</p><p className="mt-1 text-xs text-moss-700">{topic.completedContentCount}/{topic.totalContentCount} lessons complete</p></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
              <button onClick={() => setTab('lessons')} className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition', tab === 'lessons' ? 'bg-moss-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-moss-50')}><BookOpenCheck size={16} className="mr-2 inline" />Content</button>
              <button onClick={() => setTab('tests')} className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition', tab === 'tests' ? 'bg-moss-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-moss-50')}><Trophy size={16} className="mr-2 inline" />Topic tests</button>
            </div>
          </Card>
          {tab === 'lessons' ? <div className="space-y-3">{topic.subtopics.map((subtopic) => <SubtopicSection key={subtopic.id} subtopic={subtopic} />)}</div> : <TopicTests studentId={studentId} topic={topic} />}
        </div>
      </div>
    </div>
  );
};

export const ParentContentAttemptsPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-content-attempts', studentId], queryFn: () => api<{ attempts: ContentAttempt[] }>(`/api/v1/parents/students/${studentId}/content/attempts`) });
  if (query.isLoading) return <ContentSkeleton />;
  if (query.isError) return <EmptyState icon={Trophy} title="Could not load attempted tests" description="Please refresh and try again." />;
  return <div className="space-y-6"><Back to={root(studentId)}>Learning content</Back><div><p className="eyebrow">Practice history</p><h1 className="text-3xl font-bold">Attempted topic tests</h1></div><AttemptsPanel studentId={studentId} attempts={query.data?.attempts ?? []} /></div>;
};

export const ParentContentAttemptDetailPage = () => {
  const { studentId = '', attemptId = '' } = useParams();
  const [sectionId, setSectionId] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const query = useQuery({ queryKey: ['parent-content-attempt-detail', studentId, attemptId], queryFn: () => api<{ attempt: ContentAttemptDetail }>(`/api/v1/parents/students/${studentId}/content-attempts/${attemptId}`).then((response) => response.attempt) });
  const difficulties = useMemo(() => Array.from(new Set(query.data?.answers.map((answer) => answer.difficulty) ?? [])), [query.data]);
  const filteredAnswers = useMemo(() => {
    const answers = query.data?.answers ?? [];
    return answers.filter((answer) => (sectionId === 'all' || answer.sectionId === sectionId) && (difficulty === 'all' || answer.difficulty === difficulty));
  }, [query.data, difficulty, sectionId]);
  const filteredStats = useMemo(() => ({ correct: filteredAnswers.filter((answer) => answer.status === 'CORRECT').length, incorrect: filteredAnswers.filter((answer) => answer.status === 'INCORRECT' || answer.status === 'PARTIALLY_CORRECT').length, unattempted: filteredAnswers.filter((answer) => answer.status === 'UNATTEMPTED').length, marks: filteredAnswers.reduce((sum, answer) => sum + answer.marksAwarded, 0) }), [filteredAnswers]);
  if (query.isLoading) return <ContentSkeleton />;
  if (!query.data) return <EmptyState icon={BookMarked} title="Could not load attempt" description="Please go back to content and open the result again." />;
  const data = query.data;
  return (
    <div className="space-y-6">
      <Back to={`${root(studentId)}/attempts`}>Attempted tests</Back>
      <Card className="overflow-hidden"><div className="bg-gradient-to-br from-moss-900 via-moss-800 to-moss-700 p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-lime">Topic test result</p><h1 className="mt-2 text-3xl font-bold">{data.test.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-moss-50/80">{data.test.subject} · {data.test.topic} · {data.test.difficulty}</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><ResultMetric label="Score" value={`${data.marksScored}/${data.totalMarks}`} /><ResultMetric label="Accuracy" value={`${Math.round(data.accuracy)}%`} /><ResultMetric label="Correct" value={String(data.correctAnswers)} /><ResultMetric label="Incorrect" value={String(data.incorrectAnswers)} /><ResultMetric label="Time used" value={formatDuration(data.timeTakenSeconds)} /></div></div></Card>
      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="p-5"><h2 className="font-bold text-ink">Section performance</h2><div className="mt-4 space-y-3">{data.sections.map((section) => <button key={section.id} onClick={() => setSectionId(section.id)} className={cn('w-full rounded-2xl border p-4 text-left transition', sectionId === section.id ? 'border-moss-300 bg-moss-50' : 'border-stone-100 hover:border-moss-200')}><div className="flex justify-between gap-3"><span className="font-semibold text-ink">{section.name}</span><span className="text-sm font-bold text-moss-800">{section.marksScored}/{section.totalMarks}</span></div><div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500"><span>{Math.round(section.accuracy)}% accuracy</span><span>{formatDuration(section.timeTakenSeconds)}</span><span>{section.correctAnswers} correct</span></div></button>)}</div></Card>
          <Card className="p-5"><h2 className="font-bold text-ink">Filters</h2><label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-stone-400">Section</label><select className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{data.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-stone-400">Difficulty</label><select className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">All difficulties</option>{difficulties.map((item) => <option key={item} value={item}>{item}</option>)}</select></Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold text-ink">Question review</h2><p className="mt-1 text-sm text-stone-500">Showing {filteredAnswers.length} questions after filters.</p></div><div className="flex flex-wrap gap-2"><Badge className="bg-moss-100 text-moss-800">{filteredStats.correct} correct</Badge><Badge className="bg-red-50 text-red-700">{filteredStats.incorrect} incorrect</Badge><Badge className="bg-stone-100 text-stone-600">{filteredStats.unattempted} unattempted</Badge><Badge className="bg-lime/45 text-moss-900">{filteredStats.marks} marks</Badge></div></div></Card>
          {filteredAnswers.map((answer, index) => <AnswerReviewCard key={answer.id} answer={answer} index={index} />)}
          {!filteredAnswers.length && <EmptyState icon={CircleSlash} title="No questions match these filters" description="Try choosing another section or difficulty." />}
        </div>
      </div>
    </div>
  );
};

export const ParentContentBookmarksPage = () => {
  const { studentId = '' } = useParams();
  const query = useQuery({ queryKey: ['parent-content-bookmarks', studentId], queryFn: () => api<{ answers: ContentBookmarkAnswer[] }>(`/api/v1/parents/students/${studentId}/content/bookmarks`) });
  if (query.isLoading) return <ContentSkeleton />;
  return <div className="space-y-6"><Back to={root(studentId)}>Learning content</Back><Card className="p-6"><p className="eyebrow">Revision bank</p><h1 className="mt-1 text-3xl font-bold text-ink">Bookmarked topic-test answers</h1><p className="mt-2 text-sm text-stone-500">Read-only view of questions the student bookmarked after content topic tests.</p></Card>{query.data?.answers.length ? query.data.answers.map((answer, index) => <div key={answer.id} className="space-y-2"><div className="flex flex-wrap items-center gap-2 text-sm text-stone-500"><Badge className="bg-moss-50 text-moss-800">{answer.test.name}</Badge><span>{answer.test.subject} · {answer.test.topic}</span><Link className="font-semibold text-moss-700" to={`${root(studentId)}/attempts/${answer.attemptId}`}>Open full attempt</Link></div><AnswerReviewCard answer={answer} index={index} /></div>) : <EmptyState icon={Bookmark} title="No bookmarked answers yet" description="Bookmarked content topic-test questions will appear here." />}</div>;
};

const SubjectLibrary = ({ studentId, subjects }: { studentId: string; subjects: ContentSubject[] }) => <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{subjects.map((subject, index) => {
  const progress = percent(subject.completedContentCount, subject.totalContentCount);
  return <Card key={subject.id} className="group relative overflow-hidden p-6"><div className={cn('absolute right-0 top-0 size-28 translate-x-7 -translate-y-7 rounded-full opacity-70', index % 3 === 0 ? 'bg-lime/35' : index % 3 === 1 ? 'bg-sky-100' : 'bg-amber/20')} /><div className="relative"><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-moss-100 text-moss-800"><BookOpenCheck size={21} /></span><Badge className="bg-stone-100 text-stone-600">{subject.topics.length} topics</Badge></div><h2 className="mt-6 text-xl font-bold text-ink">{subject.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">{subject.description}</p><div className="mt-6"><div className="flex justify-between text-xs font-semibold"><span className="text-stone-500">Student progress</span><span className="text-moss-800">{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-moss-100"><div className="h-full rounded-full bg-lime transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-stone-400">{subject.completedContentCount} of {subject.totalContentCount} lessons completed</p></div><Link className={buttonVariants({ className: 'mt-6 w-full' })} to={`${root(studentId)}/subjects/${subject.id}`}>Open {subject.name}<ChevronRight size={16} /></Link></div></Card>;
})}</div>;

const SubtopicSection = ({ subtopic }: { subtopic: ContentSubtopic }) => {
  const [isOpen, setIsOpen] = useState(false);
  return <Card className="overflow-hidden"><button onClick={() => setIsOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-moss-50/60"><div className="min-w-0"><h3 className="font-semibold text-ink">{subtopic.name}</h3><p className="mt-1 truncate text-xs text-stone-400">{subtopic.description}</p></div><div className="flex shrink-0 items-center gap-3"><Badge className="bg-moss-50 text-moss-800">{subtopic.completedContentCount}/{subtopic.totalContentCount}</Badge><ChevronDown size={18} className={cn('text-stone-400 transition-transform', isOpen && 'rotate-180')} /></div></button>{isOpen && <div className="divide-y divide-stone-100 border-t border-stone-100">{subtopic.contents.length ? subtopic.contents.map((content) => <LessonRow key={content.id} content={content} />) : <div className="p-5 text-sm text-stone-500">Coming soon.</div>}</div>}</Card>;
};

const LessonRow = ({ content }: { content: LearningContent }) => {
  const Icon = contentVisual[content.contentType];
  return <div className={cn('flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5', !content.hasAccess && 'bg-stone-50/70')}><div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-moss-100 to-lime/35 text-moss-700">{content.thumbnailUrl ? <img src={content.thumbnailUrl} alt="" className="size-full object-cover" /> : <Icon size={19} />}{!content.hasAccess && <div className="absolute inset-0 grid place-items-center bg-moss-950/45 text-white"><Lock size={15} /></div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-ink">{content.title}</p>{content.completed && <Badge className="bg-moss-100 text-moss-800"><Check size={12} />Completed</Badge>}{!content.hasAccess && <Badge className="bg-stone-200 text-stone-600">Locked</Badge>}{content.note && <Badge className="bg-sky-100 text-sky-800"><StickyNote size={12} />Note saved</Badge>}</div><p className="mt-1 line-clamp-1 text-xs text-stone-400">{content.description}</p><div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-400"><span>{content.contentType.replace('_', ' ')}</span>{content.estimatedDurationMinutes && <span>{content.estimatedDurationMinutes} min</span>}{content.completedAt && <span>Completed {formatDateTime(content.completedAt)}</span>}{content.isFree && <span className="font-semibold text-moss-700">Free</span>}</div></div><Badge className={content.completed ? 'bg-emerald-100 text-emerald-800' : content.hasAccess ? 'bg-amber/20 text-[#98670e]' : 'bg-stone-100 text-stone-600'}>{content.completed ? 'Done' : content.hasAccess ? 'Pending' : 'Locked'}</Badge></div>;
};

const TopicTests = ({ studentId, topic }: { studentId: string; topic: ContentTopic }) => <section><div className="mb-3 flex items-center gap-2"><Trophy size={17} className="text-amber" /><h2 className="text-lg font-bold text-ink">Topic practice</h2></div>{topic.tests.length ? <div className="grid gap-4 lg:grid-cols-2">{topic.tests.map((test) => { const submitted = test.attempt?.status === 'SUBMITTED' || test.attempt?.status === 'AUTO_SUBMITTED'; return <Card key={test.id} className="p-5"><div className="flex gap-2"><div className="min-w-0 flex-1"><h3 className="font-semibold text-ink">{test.name}</h3><p className="mt-1 text-sm leading-5 text-stone-500">{test.description}</p></div><Badge className={submitted ? 'bg-moss-100 text-moss-800' : test.isFree ? 'bg-lime/45 text-moss-900' : test.hasAccess ? 'bg-moss-100 text-moss-800' : 'bg-stone-100 text-stone-500'}>{submitted ? 'Attempted' : test.isFree ? 'Free' : test.hasAccess ? 'Available' : 'Locked'}</Badge></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500"><span>{test.totalQuestions} questions</span><span>{test.durationMinutes} min</span><span>{test.totalMarks} marks</span><span>{test.sectionCount} sections</span><span>{test.difficulty}</span></div>{submitted && test.attempt ? <Link className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-moss-50 px-4 py-3 transition hover:bg-moss-100" to={`${root(studentId)}/attempts/${test.attempt.id}`}><div><p className="text-sm font-semibold text-moss-900">Score {test.attempt.marksScored}/{test.totalMarks}</p><p className="text-xs text-moss-700">Accuracy {Math.round(test.attempt.accuracy)}%</p></div><BookMarked size={18} className="text-moss-700" /></Link> : <p className="mt-4 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">Not attempted yet.</p>}</Card>; })}</div> : <Card className="border-dashed p-5 text-sm text-stone-500">Coming soon.</Card>}</section>;

const AttemptsPanel = ({ studentId, attempts }: { studentId: string; attempts: ContentAttempt[] }) => {
  if (!attempts.length) return <EmptyState icon={Trophy} title="No topic tests attempted yet" description="Completed and in-progress topic tests will be available here." />;
  return <div className="space-y-4">{attempts.map((attempt) => <Card key={attempt.id} className="p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-ink">{attempt.test.name}</h2><Badge className={attempt.status === 'IN_PROGRESS' ? 'bg-amber/20 text-[#98670e]' : 'bg-moss-100 text-moss-800'}>{attempt.status.replace('_', ' ')}</Badge></div><p className="mt-1 text-sm text-stone-500">{attempt.test.subject} · {attempt.test.topic}</p><div className="mt-4 grid grid-cols-2 gap-x-7 gap-y-2 text-sm sm:grid-cols-4"><Metric label="Score" value={`${attempt.marksScored}/${attempt.totalMarks}`} /><Metric label="Accuracy" value={`${Math.round(attempt.accuracy)}%`} /><Metric label="Time used" value={formatDuration(attempt.timeTakenSeconds)} /><Metric label="Questions" value={`${attempt.correctAnswers} correct`} /></div><p className="mt-4 text-xs text-stone-400">Started {formatDateTime(attempt.startedAt)}{attempt.submittedAt ? ` · Submitted ${formatDateTime(attempt.submittedAt)}` : ''}</p>{attempt.status !== 'IN_PROGRESS' && <div className="mt-4"><Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} to={`${root(studentId)}/attempts/${attempt.id}`}><BookMarked size={15} />Review attempt</Link></div>}</div><div className="min-w-60 rounded-2xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">Section performance</p><div className="mt-3 space-y-2">{attempt.sections.map((section) => <div key={section.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-stone-600">{section.name}</span><span className="font-semibold text-moss-800">{section.marksScored}/{section.totalMarks}</span></div>)}</div></div></div></Card>)}</div>;
};

const AnswerReviewCard = ({ answer, index }: { answer: ContentAttemptDetail['answers'][number]; index: number }) => {
  const selected = optionList(answer.selectedAnswers);
  const correct = optionList(answer.correctAnswers);
  const options = optionsAsEntries(answer.options);
  const statusStyle = answer.status === 'CORRECT' ? 'bg-moss-100 text-moss-800' : answer.status === 'UNATTEMPTED' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-700';
  const StatusIcon = answer.status === 'CORRECT' ? CheckCircle2 : answer.status === 'UNATTEMPTED' ? CircleSlash : XCircle;
  return <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-stone-100 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge className="bg-stone-100 text-stone-600">Q{index + 1}</Badge><Badge className={statusStyle}><StatusIcon size={13} />{answer.status.replace('_', ' ')}</Badge><Badge className="bg-moss-50 text-moss-800">{answer.sectionName}</Badge><Badge className="bg-amber/20 text-[#98670e]">{answer.difficulty}</Badge>{answer.bookmarked && <Badge className="bg-lime/35 text-moss-900"><Bookmark size={13} />Bookmarked</Badge>}</div><p className="mt-2 text-xs text-stone-400">{answer.subtopic} · {formatDuration(answer.timeTakenSeconds)} · {answer.marksAwarded}/{answer.positiveMarks} marks</p></div></div><div className="space-y-4 p-5">{answer.comprehension && <div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">{answer.comprehension.title ?? 'Passage'}</p><p className="mt-2 text-sm leading-7 text-stone-600">{answer.comprehension.passage}</p></div>}<div className="prose prose-sm max-w-none text-ink" dangerouslySetInnerHTML={{ __html: answer.question }} />{answer.imageUrl && <img src={answer.imageUrl} alt="" className="max-h-80 rounded-2xl border border-stone-100 object-contain" />}{options.length ? <div className="grid gap-2">{options.map((option) => { const isSelected = selected.includes(option.key) || selected.includes(option.value); const isCorrect = correct.includes(option.key) || correct.includes(option.value); return <div key={option.key} className={cn('rounded-2xl border px-4 py-3 text-sm', isCorrect ? 'border-moss-300 bg-moss-50 text-moss-900' : isSelected ? 'border-red-200 bg-red-50 text-red-800' : 'border-stone-100 bg-white text-stone-600')}><span className="mr-2 font-bold">{option.key}.</span>{option.value}{isSelected && <span className="ml-2 text-xs font-bold">(student answer)</span>}{isCorrect && <span className="ml-2 text-xs font-bold">(correct)</span>}</div>; })}</div> : <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600"><span className="font-semibold">Student answer:</span> {selected.join(', ') || 'Unattempted'}<br /><span className="font-semibold">Correct answer:</span> {correct.join(', ')}</div>}<div className="rounded-2xl bg-lime/20 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-moss-700">Explanation</p><p className="mt-2 text-sm leading-6 text-stone-700">{answer.explanation}</p></div></div></Card>;
};

const Back = ({ to, children }: { to: string; children: string }) => <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700 hover:text-moss-900"><ChevronLeft size={16} /> {children}</Link>;
const ResultMetric = ({ label, value }: { label: string; value: string }) => <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-moss-50/70">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
const Metric = ({ label, value }: { label: string; value: string }) => <div><p className="text-xs text-stone-400">{label}</p><p className="mt-0.5 font-semibold text-ink">{value}</p></div>;
const ContentSkeleton = () => <div className="space-y-7"><Skeleton className="h-24 w-full max-w-2xl" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-80" />)}</div></div>;
const optionList = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)];
const optionsAsEntries = (value: unknown): Array<{ key: string; value: string }> => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item, index) => {
    if (typeof item === 'object' && item !== null) {
      const option = item as { id?: unknown; value?: unknown; text?: unknown; label?: unknown };
      return { key: String(option.id ?? option.value ?? String.fromCharCode(65 + index)), value: String(option.text ?? option.label ?? option.value ?? option.id ?? '') };
    }
    return { key: String.fromCharCode(65 + index), value: String(item) };
  });
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({ key, value: typeof item === 'object' && item !== null ? String((item as { text?: unknown; label?: unknown; value?: unknown }).text ?? (item as { label?: unknown }).label ?? (item as { value?: unknown }).value ?? '') : String(item) }));
  return [];
};
