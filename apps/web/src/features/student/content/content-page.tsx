import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  BookOpenCheck,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  FileText,
  Globe2,
  Layers3,
  Lock,
  PlayCircle,
  RotateCcw,
  Sparkles,
  StickyNote,
  Trophy,
  Video,
  X,
  XCircle,
} from 'lucide-react';

import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn, formatDateTime } from '../../../lib/utils';
import type { ContentAttempt, ContentSubtopic, ContentSubject, ContentTopic, ContentTreeResponse, LearningContent } from './types';

type View = 'subjects' | 'learning' | 'attempts';

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
  test: {
    id: string;
    name: string;
    description: string;
    instructions: string;
    durationMinutes: number;
    totalMarks: number;
    difficulty: string;
    topic: string;
    subject: string;
  };
  sections: Array<{
    id: string;
    name: string;
    totalMarks: number;
    marksScored: number;
    accuracy: number;
    timeTakenSeconds: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unattemptedAnswers: number;
  }>;
  answers: Array<{
    id: string;
    questionId: string;
    sectionId: string;
    sectionName: string;
    sequenceNumber: number;
    questionType: string;
    question: string;
    options: unknown;
    selectedAnswers: unknown;
    correctAnswers: unknown;
    status: AnswerStatus;
    marksAwarded: number;
    positiveMarks: number;
    negativeMarks: number;
    timeTakenSeconds: number;
    visited: boolean;
    bookmarked: boolean;
    markedForReview: boolean;
    answeredAt: string | null;
    explanation: string;
    imageUrl: string | null;
    difficulty: string;
    topic: string;
    subtopic: string;
    comprehension: { id: string; title: string | null; passage: string } | null;
  }>;
};

const percent = (done: number, total: number) => total ? Math.round((done / total) * 100) : 0;
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
const contentVisual = { YOUTUBE: Video, PDF: FileText, DOCUMENT: BookOpenCheck, WEBSITE: Globe2 };
const optionList = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)];
const optionsAsEntries = (value: unknown): Array<{ key: string; value: string }> => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item, index) => ({ key: String.fromCharCode(65 + index), value: String(item) }));
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({ key, value: String(item) }));
  return [];
};

export const ContentPage = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('subjects');
  const [subjectId, setSubjectId] = useState<string>();
  const [topicId, setTopicId] = useState<string>();
  const learning = useQuery({ queryKey: ['learning-content'], queryFn: () => api<ContentTreeResponse>('/api/v1/content') });
  const attempts = useQuery({ queryKey: ['content-attempts'], queryFn: () => api<{ attempts: ContentAttempt[] }>('/api/v1/content/attempts'), enabled: view === 'attempts' });
  const updateCompletion = useMutation({
    mutationFn: ({ contentId, completed }: { contentId: string; completed: boolean }) => api(`/api/v1/content/contents/${contentId}/completion`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-content'] }),
  });
  const saveNote = useMutation({
    mutationFn: ({ contentId, note }: { contentId: string; note: string }) => api(`/api/v1/content/contents/${contentId}/note`, { method: 'PUT', body: JSON.stringify({ note }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-content'] }),
  });

  if (learning.isLoading) return <ContentSkeleton />;
  if (learning.isError || !learning.data) return <EmptyState icon={BookOpenCheck} title="Could not load learning content" description="Please refresh the page and try again." />;
  if (!learning.data.subjects.length) return <EmptyState icon={BookOpenCheck} title="Learning library is on its way" description="There are no active learning resources yet." />;

  const subject = learning.data.subjects.find((item) => item.id === subjectId) ?? learning.data.subjects[0];
  const openSubject = (item: ContentSubject) => {
    setSubjectId(item.id);
    setTopicId(item.topics[0]?.id);
    setView('learning');
  };

  return <div className="space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-moss-700">Learning library</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{view === 'attempts' ? 'Practice history' : view === 'learning' ? subject.name : 'Choose a subject'}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{view === 'subjects' ? 'Pick a subject to continue your structured preparation.' : view === 'attempts' ? 'Review your completed and in-progress topic test attempts.' : 'Select a topic, learn in sequence, then reinforce it with a focused practice test.'}</p>
      </div>
      <div className="flex gap-2">
        {view !== 'subjects' && <Button variant="outline" onClick={() => setView('subjects')}><ArrowLeft size={16} />All subjects</Button>}
        <Button variant={view === 'attempts' ? 'secondary' : 'outline'} onClick={() => setView('attempts')}><Trophy size={16} />Attempted tests</Button>
      </div>
    </header>
    {view === 'subjects' && <SubjectLibrary subjects={learning.data.subjects} onSelect={openSubject} />}
    {view === 'learning' && <LearningWorkspace subject={subject} topicId={topicId} onTopicChange={setTopicId} onCompletion={(contentId, completed) => updateCompletion.mutate({ contentId, completed })} saving={updateCompletion.isPending} onSaveNote={(contentId, note) => saveNote.mutateAsync({ contentId, note })} savingNote={saveNote.isPending} onShowAttempts={() => setView('attempts')} />}
    {view === 'attempts' && <AttemptsPanel attempts={attempts} />}
  </div>;
};

const SubjectLibrary = ({ subjects, onSelect }: { subjects: ContentSubject[]; onSelect: (subject: ContentSubject) => void }) => <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{subjects.map((subject, index) => {
  const progress = percent(subject.completedContentCount, subject.totalContentCount);
  return <Card key={subject.id} className="group relative overflow-hidden p-6">
    <div className={cn('absolute right-0 top-0 size-28 translate-x-7 -translate-y-7 rounded-full opacity-70', index % 3 === 0 ? 'bg-lime/35' : index % 3 === 1 ? 'bg-sky-100' : 'bg-amber/20')} />
    <div className="relative">
      <div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-moss-100 text-moss-800"><BookOpenCheck size={21} /></span><Badge className="bg-stone-100 text-stone-600">{subject.topics.length} topics</Badge></div>
      <h2 className="mt-6 text-xl font-bold text-ink">{subject.name}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">{subject.description}</p>
      <div className="mt-6"><div className="flex justify-between text-xs font-semibold"><span className="text-stone-500">Your progress</span><span className="text-moss-800">{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-moss-100"><div className="h-full rounded-full bg-lime transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-stone-400">{subject.completedContentCount} of {subject.totalContentCount} lessons completed</p></div>
      <Button className="mt-6 w-full" onClick={() => onSelect(subject)}>Open {subject.name}<ChevronRight size={16} /></Button>
    </div>
  </Card>;
})}</div>;

const LearningWorkspace = ({ subject, topicId, onTopicChange, onCompletion, saving, onSaveNote, savingNote, onShowAttempts }: { subject: ContentSubject; topicId: string | undefined; onTopicChange: (id: string) => void; onCompletion: (id: string, completed: boolean) => void; saving: boolean; onSaveNote: (id: string, note: string) => Promise<unknown>; savingNote: boolean; onShowAttempts: () => void }) => {
  const [tab, setTab] = useState<'lessons' | 'tests'>('lessons');
  const topic = subject.topics.find((item) => item.id === topicId) ?? subject.topics[0];
  if (!topic) return <EmptyState icon={Layers3} title="No topics available" description="Resources will appear here when this subject is published." />;
  return <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
    <Card className="h-fit overflow-hidden"><div className="border-b border-stone-100 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-stone-400">{subject.name} topics</p></div><div className="p-2">{subject.topics.map((item) => <button key={item.id} onClick={() => { onTopicChange(item.id); setTab('lessons'); }} className={cn('w-full rounded-2xl px-3 py-3 text-left transition', item.id === topic.id ? 'bg-moss-800 text-white shadow-sm' : 'text-stone-600 hover:bg-moss-50')}><span className="block text-sm font-semibold">{item.name}</span><span className={cn('mt-1 block text-xs', item.id === topic.id ? 'text-moss-100/70' : 'text-stone-400')}>{percent(item.completedContentCount, item.totalContentCount)}% complete · {item.totalContentCount} lessons</span><div className={cn('mt-2 h-1 overflow-hidden rounded-full', item.id === topic.id ? 'bg-white/15' : 'bg-stone-100')}><div className="h-full rounded-full bg-lime" style={{ width: `${percent(item.completedContentCount, item.totalContentCount)}%` }} /></div></button>)}</div></Card>
    <div className="min-w-0 space-y-5"><div className="flex items-center gap-2 text-sm text-stone-500"><span>{subject.name}</span><ChevronRight size={15} /><span className="font-medium text-ink">{topic.name}</span></div><Card className="p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-moss-700">Current topic</p><h2 className="mt-1 text-2xl font-bold text-ink">{topic.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{topic.description}</p></div><div className="rounded-2xl bg-moss-50 px-4 py-3 sm:min-w-36"><p className="text-xl font-bold text-moss-900">{percent(topic.completedContentCount, topic.totalContentCount)}%</p><p className="mt-1 text-xs text-moss-700">{topic.completedContentCount}/{topic.totalContentCount} lessons complete</p></div></div><div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-4"><button onClick={() => setTab('lessons')} className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition', tab === 'lessons' ? 'bg-moss-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-moss-50')}><BookOpenCheck size={16} className="mr-2 inline" />Content</button><button onClick={() => setTab('tests')} className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition', tab === 'tests' ? 'bg-moss-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-moss-50')}><Sparkles size={16} className="mr-2 inline" />Topic tests</button><button onClick={onShowAttempts} className="ml-auto rounded-xl px-4 py-2 text-sm font-semibold text-moss-800 transition hover:bg-moss-50"><Trophy size={16} className="mr-2 inline" />Attempt history</button></div></Card>{tab === 'lessons' ? <div className="space-y-3">{topic.subtopics.map((subtopic) => <SubtopicSection key={subtopic.id} subtopic={subtopic} onCompletion={onCompletion} saving={saving} onSaveNote={onSaveNote} savingNote={savingNote} />)}</div> : <TopicTests topic={topic} />}</div>
  </div>;
};

const SubtopicSection = ({ subtopic, onCompletion, saving, onSaveNote, savingNote }: { subtopic: ContentSubtopic; onCompletion: (id: string, completed: boolean) => void; saving: boolean; onSaveNote: (id: string, note: string) => Promise<unknown>; savingNote: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  return <Card className="overflow-hidden">
    <button onClick={() => setIsOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-moss-50/60">
      <div className="min-w-0"><h3 className="font-semibold text-ink">{subtopic.name}</h3><p className="mt-1 truncate text-xs text-stone-400">{subtopic.description}</p></div>
      <div className="flex shrink-0 items-center gap-3"><Badge className="bg-moss-50 text-moss-800">{subtopic.completedContentCount}/{subtopic.totalContentCount}</Badge><ChevronDown size={18} className={cn('text-stone-400 transition-transform', isOpen && 'rotate-180')} /></div>
    </button>
    {isOpen && <div className="divide-y divide-stone-100 border-t border-stone-100">{subtopic.contents.map((content) => <LessonRow key={content.id} content={content} onCompletion={onCompletion} saving={saving} onSaveNote={onSaveNote} savingNote={savingNote} />)}</div>}
  </Card>;
};

const LessonRow = ({ content, onCompletion, saving, onSaveNote, savingNote }: { content: LearningContent; onCompletion: (id: string, completed: boolean) => void; saving: boolean; onSaveNote: (id: string, note: string) => Promise<unknown>; savingNote: boolean }) => {
  const Icon = contentVisual[content.contentType];
  const [notesOpen, setNotesOpen] = useState(false);
  return <>
    <div className={cn('flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5', !content.hasAccess && 'bg-stone-50/70')}>
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-moss-100 to-lime/35 text-moss-700">{content.thumbnailUrl ? <img src={content.thumbnailUrl} alt="" className="size-full object-cover" /> : <Icon size={19} />}{!content.hasAccess && <div className="absolute inset-0 grid place-items-center bg-moss-950/45 text-white"><Lock size={15} /></div>}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-ink">{content.title}</p>{content.completed && <Badge className="bg-moss-100 text-moss-800"><Check size={12} />Completed</Badge>}{!content.hasAccess && <Badge className="bg-stone-200 text-stone-600">Locked</Badge>}</div><div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-400"><span>{content.contentType.replace('_', ' ')}</span>{content.estimatedDurationMinutes && <span>{content.estimatedDurationMinutes} min</span>}{content.isFree && <span className="font-semibold text-moss-700">Free</span>}{content.note && <span className="font-semibold text-moss-700">Note saved</span>}</div></div>
      <div className="flex shrink-0 gap-2"><Button variant="ghost" size="sm" disabled={!content.hasAccess} onClick={() => setNotesOpen(true)}><StickyNote size={15} />Notes</Button><Button variant="outline" size="sm" disabled={!content.hasAccess} onClick={() => { if (content.contentUrl) window.open(content.contentUrl, '_blank', 'noopener,noreferrer'); }}><PlayCircle size={15} />Open</Button><Button size="sm" variant={content.completed ? 'secondary' : 'primary'} disabled={!content.hasAccess || saving} onClick={() => onCompletion(content.id, !content.completed)}>{content.completed ? 'Undo' : 'Complete'}</Button></div>
    </div>
    {notesOpen && <NoteDialog content={content} saving={savingNote} onClose={() => setNotesOpen(false)} onSave={async (note) => { await onSaveNote(content.id, note); setNotesOpen(false); }} />}
  </>;
};

const NoteDialog = ({ content, saving, onClose, onSave }: { content: LearningContent; saving: boolean; onClose: () => void; onSave: (note: string) => Promise<void> }) => {
  const [note, setNote] = useState(content.note?.text ?? '');
  return <div className="fixed inset-0 z-50 grid place-items-center bg-moss-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Content notes"><Card className="w-full max-w-xl p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-moss-700">Personal note</p><h2 className="mt-1 text-lg font-bold text-ink">{content.title}</h2></div><button className="rounded-lg p-2 text-stone-400 hover:bg-stone-100" onClick={onClose} aria-label="Close notes"><X size={18} /></button></div><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={10000} placeholder="Capture a formula, concept, doubt, or revision point..." className="focus-ring mt-5 min-h-44 w-full resize-y rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-ink placeholder:text-stone-400" /><div className="mt-2 text-right text-xs text-stone-400">{note.length}/10,000</div><div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!note.trim() || saving} onClick={() => void onSave(note.trim())}>{saving ? 'Saving...' : 'Save note'}</Button></div></Card></div>;
};

const TopicTests = ({ topic }: { topic: ContentTopic }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startAttempt = useMutation({
    mutationFn: (testId: string) => api<{ attempt: { id: string; enginePath: string } }>(`/api/v1/test-engine/content/tests/${testId}/attempts`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['learning-content'] });
      queryClient.invalidateQueries({ queryKey: ['content-attempts'] });
      navigate(data.attempt.enginePath);
    },
  });
  return <section>
    <div className="mb-3 flex items-center gap-2"><Sparkles size={17} className="text-amber" /><h2 className="text-lg font-bold text-ink">Topic practice</h2></div>
    {topic.tests.length ? <div className="grid gap-4 lg:grid-cols-2">{topic.tests.map((test) => {
      const isSubmitted = test.attempt?.status === 'SUBMITTED' || test.attempt?.status === 'AUTO_SUBMITTED';
      const isInProgress = test.attempt?.status === 'IN_PROGRESS';
      return <Card key={test.id} className="p-5">
        <div className="flex gap-2"><div className="min-w-0 flex-1"><h3 className="font-semibold text-ink">{test.name}</h3><p className="mt-1 text-sm leading-5 text-stone-500">{test.description}</p></div><Badge className={test.isFree ? 'bg-lime/45 text-moss-900' : test.hasAccess ? 'bg-moss-100 text-moss-800' : 'bg-stone-100 text-stone-500'}>{isSubmitted ? 'Attempted' : test.isFree ? 'Free' : test.hasAccess ? 'Included' : 'Locked'}</Badge></div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500"><span>{test.totalQuestions} questions</span><span>{test.durationMinutes} min</span><span>{test.totalMarks} marks</span><span>{test.sectionCount} sections</span><span>{test.difficulty}</span></div>
        {isSubmitted && test.attempt ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-moss-50 px-4 py-3"><div><p className="text-sm font-semibold text-moss-900">Score {test.attempt.marksScored}/{test.totalMarks}</p><p className="text-xs text-moss-700">Accuracy {Math.round(test.attempt.accuracy)}%</p></div><Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} to={`/student/content/attempts/${test.attempt.id}`}><BookMarked size={15} />View result</Link></div> : <Button className="mt-5" size="sm" variant={test.hasAccess ? 'primary' : 'outline'} disabled={!test.hasAccess || startAttempt.isPending} onClick={() => startAttempt.mutate(test.id)}>{isInProgress ? <RotateCcw size={15} /> : test.hasAccess ? <PlayCircle size={15} /> : <Lock size={15} />}{isInProgress ? 'Resume test' : test.hasAccess ? 'Start test' : 'Locked'}</Button>}
      </Card>;
    })}</div> : <Card className="border-dashed p-5 text-sm text-stone-500">No practice test has been added for this topic yet.</Card>}
  </section>;
};

const AttemptsPanel = ({ attempts }: { attempts: ReturnType<typeof useQuery<{ attempts: ContentAttempt[] }>> }) => {
  if (attempts.isLoading) return <div className="space-y-4">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-44" />)}</div>;
  if (attempts.isError) return <EmptyState icon={Trophy} title="Could not load attempted tests" description="Please refresh the page and try again." />;
  if (!attempts.data?.attempts.length) return <EmptyState icon={Trophy} title="No topic tests attempted yet" description="Your completed and in-progress practice tests will be available here." />;
  return <div className="space-y-4">{attempts.data.attempts.map((attempt) => {
    const isInProgress = attempt.status === 'IN_PROGRESS';
    return <Card key={attempt.id} className="p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-ink">{attempt.test.name}</h2><Badge className={isInProgress ? 'bg-amber/20 text-[#98670e]' : 'bg-moss-100 text-moss-800'}>{attempt.status.replace('_', ' ')}</Badge></div><p className="mt-1 text-sm text-stone-500">{attempt.test.subject} · {attempt.test.topic}</p><div className="mt-4 grid grid-cols-2 gap-x-7 gap-y-2 text-sm sm:grid-cols-4"><Metric label="Score" value={`${attempt.marksScored}/${attempt.totalMarks}`} /><Metric label="Accuracy" value={`${Math.round(attempt.accuracy)}%`} /><Metric label="Time used" value={formatDuration(attempt.timeTakenSeconds)} /><Metric label="Questions" value={`${attempt.correctAnswers} correct`} /></div><p className="mt-4 text-xs text-stone-400">Started {formatDateTime(attempt.startedAt)}{attempt.submittedAt ? ` · Submitted ${formatDateTime(attempt.submittedAt)}` : ''}</p><div className="mt-4"><Link className={buttonVariants({ variant: isInProgress ? 'primary' : 'secondary', size: 'sm' })} to={isInProgress ? `/student/test-engine/content/${attempt.id}` : `/student/content/attempts/${attempt.id}`}>{isInProgress ? <RotateCcw size={15} /> : <BookMarked size={15} />}{isInProgress ? 'Resume test' : 'Review attempt'}</Link></div></div><div className="min-w-60 rounded-2xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">Section performance</p><div className="mt-3 space-y-2">{attempt.sections.map((section) => <div key={section.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-stone-600">{section.name}</span><span className="font-semibold text-moss-800">{section.marksScored}/{section.totalMarks}</span></div>)}</div></div></div></Card>;
  })}</div>;
};

export const ContentAttemptDetailPage = () => {
  const { attemptId } = useParams();
  const queryClient = useQueryClient();
  const [sectionId, setSectionId] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const attempt = useQuery({
    queryKey: ['content-attempt-detail', attemptId],
    queryFn: () => api<{ attempt: ContentAttemptDetail }>(`/api/v1/content/attempts/${attemptId}`).then((response) => response.attempt),
    enabled: Boolean(attemptId),
  });
  const bookmark = useMutation({
    mutationFn: ({ answerId, bookmarked }: { answerId: string; bookmarked: boolean }) => api(`/api/v1/content/attempt-answers/${answerId}/bookmark`, { method: 'PATCH', body: JSON.stringify({ bookmarked }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content-attempt-detail', attemptId] }),
  });

  const difficulties = useMemo(() => Array.from(new Set(attempt.data?.answers.map((answer) => answer.difficulty) ?? [])), [attempt.data]);
  const filteredAnswers = useMemo(() => {
    const answers = attempt.data?.answers ?? [];
    return answers.filter((answer) => (sectionId === 'all' || answer.sectionId === sectionId) && (difficulty === 'all' || answer.difficulty === difficulty));
  }, [attempt.data, difficulty, sectionId]);
  const filteredStats = useMemo(() => ({
    correct: filteredAnswers.filter((answer) => answer.status === 'CORRECT').length,
    incorrect: filteredAnswers.filter((answer) => answer.status === 'INCORRECT' || answer.status === 'PARTIALLY_CORRECT').length,
    unattempted: filteredAnswers.filter((answer) => answer.status === 'UNATTEMPTED').length,
    marks: filteredAnswers.reduce((sum, answer) => sum + answer.marksAwarded, 0),
  }), [filteredAnswers]);

  if (attempt.isLoading) return <div className="space-y-6"><Skeleton className="h-44" /><Skeleton className="h-72" /></div>;
  if (attempt.isError || !attempt.data) return <EmptyState icon={BookMarked} title="Could not load attempt" description="Please go back to content and open the result again." />;
  const data = attempt.data;

  return <div className="space-y-6">
    <Link to="/student/content" className="inline-flex items-center gap-2 text-sm font-semibold text-moss-800 hover:text-moss-950"><ArrowLeft size={16} />Back to learning content</Link>
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-moss-900 via-moss-800 to-moss-700 p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-lime">Topic test result</p>
        <h1 className="mt-2 text-3xl font-bold">{data.test.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-moss-50/80">{data.test.subject} · {data.test.topic} · {data.test.difficulty}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ResultMetric label="Score" value={`${data.marksScored}/${data.totalMarks}`} />
          <ResultMetric label="Accuracy" value={`${Math.round(data.accuracy)}%`} />
          <ResultMetric label="Correct" value={String(data.correctAnswers)} />
          <ResultMetric label="Incorrect" value={String(data.incorrectAnswers)} />
          <ResultMetric label="Time used" value={formatDuration(data.timeTakenSeconds)} />
        </div>
      </div>
    </Card>
    <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card className="p-5"><h2 className="font-bold text-ink">Section performance</h2><div className="mt-4 space-y-3">{data.sections.map((section) => <button key={section.id} onClick={() => setSectionId(section.id)} className={cn('w-full rounded-2xl border p-4 text-left transition', sectionId === section.id ? 'border-moss-300 bg-moss-50' : 'border-stone-100 hover:border-moss-200')}><div className="flex justify-between gap-3"><span className="font-semibold text-ink">{section.name}</span><span className="text-sm font-bold text-moss-800">{section.marksScored}/{section.totalMarks}</span></div><div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500"><span>{Math.round(section.accuracy)}% accuracy</span><span>{formatDuration(section.timeTakenSeconds)}</span><span>{section.correctAnswers} correct</span></div></button>)}</div></Card>
        <Card className="p-5"><h2 className="font-bold text-ink">Filters</h2><label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-stone-400">Section</label><select className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="all">Entire test</option>{data.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-stone-400">Difficulty</label><select className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">All difficulties</option>{difficulties.map((item) => <option key={item} value={item}>{item}</option>)}</select></Card>
      </div>
      <div className="space-y-5">
        <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold text-ink">Question review</h2><p className="mt-1 text-sm text-stone-500">Showing {filteredAnswers.length} questions after filters.</p></div><div className="flex flex-wrap gap-2"><Badge className="bg-moss-100 text-moss-800">{filteredStats.correct} correct</Badge><Badge className="bg-red-50 text-red-700">{filteredStats.incorrect} incorrect</Badge><Badge className="bg-stone-100 text-stone-600">{filteredStats.unattempted} unattempted</Badge><Badge className="bg-lime/45 text-moss-900">{filteredStats.marks} marks</Badge></div></div></Card>
        {filteredAnswers.map((answer, index) => <AnswerReviewCard key={answer.id} answer={answer} index={index} onBookmark={(bookmarked) => bookmark.mutate({ answerId: answer.id, bookmarked })} savingBookmark={bookmark.isPending} />)}
        {!filteredAnswers.length && <EmptyState icon={CircleSlash} title="No questions match these filters" description="Try choosing another section or difficulty." />}
      </div>
    </div>
  </div>;
};

const AnswerReviewCard = ({ answer, index, onBookmark, savingBookmark }: { answer: ContentAttemptDetail['answers'][number]; index: number; onBookmark: (bookmarked: boolean) => void; savingBookmark: boolean }) => {
  const selected = optionList(answer.selectedAnswers);
  const correct = optionList(answer.correctAnswers);
  const options = optionsAsEntries(answer.options);
  const statusStyle = answer.status === 'CORRECT' ? 'bg-moss-100 text-moss-800' : answer.status === 'UNATTEMPTED' ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-700';
  const StatusIcon = answer.status === 'CORRECT' ? CheckCircle2 : answer.status === 'UNATTEMPTED' ? CircleSlash : XCircle;
  return <Card className="overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-stone-100 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><Badge className="bg-stone-100 text-stone-600">Q{index + 1}</Badge><Badge className={statusStyle}><StatusIcon size={13} />{answer.status.replace('_', ' ')}</Badge><Badge className="bg-moss-50 text-moss-800">{answer.sectionName}</Badge><Badge className="bg-amber/20 text-[#98670e]">{answer.difficulty}</Badge></div><p className="mt-2 text-xs text-stone-400">{answer.subtopic} · {formatDuration(answer.timeTakenSeconds)} · {answer.marksAwarded}/{answer.positiveMarks} marks</p></div>
      <Button size="sm" variant={answer.bookmarked ? 'secondary' : 'outline'} disabled={savingBookmark} onClick={() => onBookmark(!answer.bookmarked)}><Bookmark size={15} className={answer.bookmarked ? 'fill-current' : ''} />{answer.bookmarked ? 'Bookmarked' : 'Bookmark'}</Button>
    </div>
    <div className="space-y-4 p-5">
      {answer.comprehension && <div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">{answer.comprehension.title ?? 'Passage'}</p><p className="mt-2 text-sm leading-7 text-stone-600">{answer.comprehension.passage}</p></div>}
      <div className="prose prose-sm max-w-none text-ink" dangerouslySetInnerHTML={{ __html: answer.question }} />
      {answer.imageUrl && <img src={answer.imageUrl} alt="" className="max-h-80 rounded-2xl border border-stone-100 object-contain" />}
      {options.length ? <div className="grid gap-2">{options.map((option) => {
        const isSelected = selected.includes(option.key) || selected.includes(option.value);
        const isCorrect = correct.includes(option.key) || correct.includes(option.value);
        return <div key={option.key} className={cn('rounded-2xl border px-4 py-3 text-sm', isCorrect ? 'border-moss-300 bg-moss-50 text-moss-900' : isSelected ? 'border-red-200 bg-red-50 text-red-800' : 'border-stone-100 bg-white text-stone-600')}><span className="mr-2 font-bold">{option.key}.</span>{option.value}{isSelected && <span className="ml-2 text-xs font-bold">(your answer)</span>}{isCorrect && <span className="ml-2 text-xs font-bold">(correct)</span>}</div>;
      })}</div> : <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600"><span className="font-semibold">Your answer:</span> {selected.join(', ') || 'Unattempted'}<br /><span className="font-semibold">Correct answer:</span> {correct.join(', ')}</div>}
      <div className="rounded-2xl bg-lime/20 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-moss-700">Explanation</p><p className="mt-2 text-sm leading-6 text-stone-700">{answer.explanation}</p></div>
    </div>
  </Card>;
};

const ResultMetric = ({ label, value }: { label: string; value: string }) => <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-moss-50/70">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
const Metric = ({ label, value }: { label: string; value: string }) => <div><p className="text-xs text-stone-400">{label}</p><p className="mt-0.5 font-semibold text-ink">{value}</p></div>;
const ContentSkeleton = () => <div className="space-y-7"><Skeleton className="h-24 w-full max-w-2xl" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-80" />)}</div></div>;
