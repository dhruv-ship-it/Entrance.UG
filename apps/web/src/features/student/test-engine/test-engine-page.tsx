import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, Grid3X3, LoaderCircle, LogOut, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

type Pillar = 'mock' | 'content' | 'batch' | 'rc';

type EngineQuestion = {
  id: string;
  sectionId: string | null;
  sectionName: string | null;
  sequenceNumber: number;
  globalOrder: number;
  questionType: 'MCQ' | 'MULTIPLE_CORRECT' | 'INTEGER' | 'TRUE_FALSE';
  question: string;
  options: unknown;
  positiveMarks: number;
  negativeMarks: number;
  imageUrl?: string | null;
  comprehension?: { id: string; title: string | null; passage: string } | null;
  answer: {
    selectedAnswers: unknown;
    visited: boolean;
    bookmarked: boolean;
    markedForReview: boolean;
    timeTakenSeconds: number;
  };
};

type EnginePayload = {
  pillar: Pillar;
  attempt: { id: string; status: string; startedAt: string; submittedAt: string | null; totalMarks: number };
  test: {
    id: string;
    title: string;
    description: string;
    instructions: string;
    durationMinutes: number;
    canGoBackBetweenSections: boolean;
    rcPassage: string | null;
    sections: { id: string; name: string; sequenceNumber: number; instructions: string; durationMinutes: number | null; totalMarks: number; canGoBackToPreviousQuestion: boolean; questionCount: number }[];
    questions: EngineQuestion[];
  };
};

type LocalAnswer = {
  selectedAnswers: string[];
  visited: boolean;
  bookmarked: boolean;
  markedForReview: boolean;
  timeTakenSeconds: number;
};

const pillarExitPath: Record<Pillar, string> = {
  mock: '/student/mock-tests',
  content: '/student/content',
  batch: '/student/mentorship',
  rc: '/student/rc',
};

export const TestEnginePage = () => {
  const { pillar = '', attemptId = '' } = useParams();
  const navigate = useNavigate();
  const parsedPillar = ['mock', 'content', 'batch', 'rc'].includes(pillar) ? pillar as Pillar : null;
  const query = useQuery({
    queryKey: ['test-engine', parsedPillar, attemptId],
    queryFn: () => api<{ engine: EnginePayload }>(`/api/v1/test-engine/${parsedPillar}/attempts/${attemptId}`).then((response) => response.engine),
    enabled: Boolean(parsedPillar && attemptId),
    refetchOnWindowFocus: false,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const activeQuestionStartedAt = useRef(Date.now());
  const submittedRef = useRef(false);

  const engine = query.data;
  const questions = engine?.test.questions ?? [];
  const current = questions[currentIndex];
  const currentAnswer = current ? answers[current.id] : null;
  const currentSection = current ? engine?.test.sections.find((section) => section.id === current.sectionId) : null;

  const accrueCurrentQuestionTime = () => {
    if (!current) return;
    const delta = Math.max(0, Math.floor((Date.now() - activeQuestionStartedAt.current) / 1000));
    if (!delta) return;
    setAnswers((value) => patchAnswer(value, current.id, { timeTakenSeconds: (value[current.id]?.timeTakenSeconds ?? 0) + delta }));
    activeQuestionStartedAt.current = Date.now();
  };

  const save = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: LocalAnswer }) => api(`/api/v1/test-engine/${parsedPillar}/attempts/${attemptId}/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(answer),
    }),
  });

  const submit = useMutation<unknown, Error, boolean>({
    mutationFn: (autoSubmitted = false) => api<{ result: { attemptId: string; score: number; correct: number; incorrect: number; unattempted: number; accuracy: number } }>(`/api/v1/test-engine/${parsedPillar}/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ autoSubmitted, sectionTimes: buildSectionTimes(questions, answers) }),
    }),
    onSuccess: () => {
      submittedRef.current = true;
      navigate(pillarExitPath[parsedPillar!] ?? '/student/dashboard', { replace: true, state: { testSubmitted: true } });
    },
  });

  useEffect(() => {
    if (!engine) return;
    const seeded: Record<string, LocalAnswer> = {};
    for (const question of engine.test.questions) {
      seeded[question.id] = {
        selectedAnswers: normalizeSelected(question.answer.selectedAnswers),
        visited: question.answer.visited,
        bookmarked: question.answer.bookmarked,
        markedForReview: question.answer.markedForReview,
        timeTakenSeconds: question.answer.timeTakenSeconds,
      };
    }
    setAnswers(seeded);
    const startedAt = new Date(engine.attempt.startedAt).getTime();
    const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    setRemainingSeconds(Math.max(0, engine.test.durationMinutes * 60 - elapsed));
  }, [engine]);

  useEffect(() => {
    if (!current) return;
    activeQuestionStartedAt.current = Date.now();
    setAnswers((value) => patchAnswer(value, current.id, { visited: true }));
  }, [current?.id]);

  useEffect(() => {
    if (!current || !currentAnswer) return;
    const handle = window.setTimeout(() => {
      const delta = Math.max(0, Math.floor((Date.now() - activeQuestionStartedAt.current) / 1000));
      void save.mutate({ questionId: current.id, answer: { ...currentAnswer, timeTakenSeconds: currentAnswer.timeTakenSeconds + delta } });
    }, 450);
    return () => window.clearTimeout(handle);
  }, [current?.id, currentAnswer?.selectedAnswers.join('|'), currentAnswer?.bookmarked, currentAnswer?.markedForReview]);

  useEffect(() => {
    if (!engine || submit.isPending || submittedRef.current) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          void submit.mutate(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [engine, submit.isPending]);

  const statusCounts = useMemo(() => {
    const values = Object.values(answers);
    return {
      answered: values.filter((answer) => answer.selectedAnswers.length && !answer.markedForReview).length,
      marked: values.filter((answer) => answer.markedForReview && !answer.selectedAnswers.length).length,
      answeredMarked: values.filter((answer) => answer.markedForReview && answer.selectedAnswers.length).length,
      notAnswered: values.filter((answer) => answer.visited && !answer.selectedAnswers.length && !answer.markedForReview).length,
      notVisited: Math.max(0, questions.length - values.filter((answer) => answer.visited).length),
    };
  }, [answers, questions.length]);

  if (!parsedPillar) return <EmptyState icon={AlertTriangle} title="Invalid test engine URL" description="This test engine route is not supported." />;
  if (query.isLoading) return <div className="grid h-screen place-items-center bg-stone-50"><Skeleton className="h-[86vh] w-[92vw] rounded-4xl" /></div>;
  if (query.isError || !engine || !current || !currentAnswer) return <div className="grid h-screen place-items-center bg-stone-50"><EmptyState icon={AlertTriangle} title="Unable to open attempt" description="This attempt may be submitted, expired, or unavailable." /></div>;

  const goToQuestion = (index: number) => {
    if (!canNavigateTo(engine, currentIndex, index)) return;
    accrueCurrentQuestionTime();
    setCurrentIndex(index);
    setReviewOpen(false);
  };

  const selected = currentAnswer.selectedAnswers;

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-ink">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss-700">{engine.pillar} test engine</p>
            <h1 className="line-clamp-1 text-lg font-bold md:text-xl">{engine.test.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={remainingSeconds < 300 ? 'bg-red-50 text-red-700' : 'bg-moss-50 text-moss-800'}><Clock3 size={14} />{formatTime(remainingSeconds)}</Badge>
            <Button variant="outline" onClick={() => setReviewOpen(true)}><Grid3X3 size={16} />Review</Button>
            <Button variant="danger" disabled={submit.isPending} onClick={() => { accrueCurrentQuestionTime(); setConfirmSubmit(true); }}><LogOut size={16} />Submit</Button>
          </div>
        </div>
      </header>

      <main className="grid gap-5 p-4 lg:grid-cols-[1fr_320px] lg:p-6">
        <section className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-moss-800">{current.sectionName ?? 'Questions'} · Question {currentIndex + 1} of {questions.length}</p>
                <p className="mt-1 text-xs text-stone-500">+{current.positiveMarks} marks · -{current.negativeMarks} marks · {current.questionType.replace('_', ' ')}</p>
              </div>
              <div className="flex gap-2">
                <Button variant={currentAnswer.markedForReview ? 'secondary' : 'outline'} size="sm" onClick={() => setAnswers((value) => patchAnswer(value, current.id, { markedForReview: !currentAnswer.markedForReview }))}><Flag size={15} />Review</Button>
              </div>
            </div>
          </Card>

          {(engine.test.rcPassage || current.comprehension) && (
            <Card className="max-h-[38vh] overflow-auto p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss-700">{current.comprehension?.title ?? 'Reading passage'}</p>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{current.comprehension?.passage ?? engine.test.rcPassage}</div>
            </Card>
          )}

          <Card className="p-5 md:p-7">
            {current.imageUrl && <img src={current.imageUrl} alt="" className="mb-5 max-h-80 rounded-2xl object-contain" />}
            <div className="whitespace-pre-wrap text-base font-semibold leading-8 md:text-lg">{current.question}</div>
            <QuestionInput question={current} selected={selected} onChange={(next) => setAnswers((value) => patchAnswer(value, current.id, { selectedAnswers: next, visited: true }))} />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" disabled={currentIndex === 0 || !canNavigateTo(engine, currentIndex, currentIndex - 1)} onClick={() => goToQuestion(currentIndex - 1)}><ChevronLeft size={16} />Previous</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setAnswers((value) => patchAnswer(value, current.id, { selectedAnswers: [] }))}><RotateCcw size={16} />Clear response</Button>
              <Button onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}>Save & next<ChevronRight size={16} /></Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="font-bold">Question palette</h2>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const state = questionStatus(answers[question.id]);
                return <button key={question.id} disabled={!canNavigateTo(engine, currentIndex, index)} className={cn('grid size-10 place-items-center rounded-xl text-sm font-bold transition', paletteClass(state), index === currentIndex && 'ring-2 ring-moss-800 ring-offset-2', !canNavigateTo(engine, currentIndex, index) && 'cursor-not-allowed opacity-45')} onClick={() => goToQuestion(index)}>{index + 1}</button>;
              })}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="font-bold">Status</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <Legend color="bg-moss-700" label="Answered" value={statusCounts.answered} />
              <Legend color="bg-amber" label="Marked" value={statusCounts.marked} />
              <Legend color="bg-purple-500" label="Answered & marked" value={statusCounts.answeredMarked} />
              <Legend color="bg-red-500" label="Not answered" value={statusCounts.notAnswered} />
              <Legend color="bg-stone-200" label="Not visited" value={statusCounts.notVisited} />
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="font-bold">Section rules</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{currentSection?.instructions || engine.test.instructions}</p>
            <p className="mt-3 text-xs font-semibold text-stone-500">{currentSection?.canGoBackToPreviousQuestion ? 'You can revisit previous questions in this section.' : 'This section is forward-only once you move ahead.'}</p>
          </Card>
        </aside>
      </main>

      {(reviewOpen || confirmSubmit) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-moss-950/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="eyebrow">{confirmSubmit ? 'Submit test' : 'Review answers'}</p><h2 className="text-xl font-bold">{confirmSubmit ? 'Are you sure you want to submit?' : 'Question review'}</h2></div>
              <Button variant="ghost" onClick={() => { setReviewOpen(false); setConfirmSubmit(false); }}>Close</Button>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8">
              {questions.map((question, index) => <button key={question.id} className={cn('grid size-10 place-items-center rounded-xl text-sm font-bold', paletteClass(questionStatus(answers[question.id])))} onClick={() => goToQuestion(index)}>{index + 1}</button>)}
            </div>
            {confirmSubmit && (
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Keep attempting</Button>
                <Button disabled={submit.isPending} onClick={() => { accrueCurrentQuestionTime(); submit.mutate(false); }}>{submit.isPending ? <><LoaderCircle size={16} className="animate-spin" />Submitting…</> : <><CheckCircle2 size={16} />Submit now</>}</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

const QuestionInput = ({ question, selected, onChange }: { question: EngineQuestion; selected: string[]; onChange: (next: string[]) => void }) => {
  if (question.questionType === 'INTEGER') return <input className="focus-ring mt-6 w-full max-w-xs rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-lg font-semibold" value={selected[0] ?? ''} inputMode="numeric" placeholder="Enter integer answer" onChange={(event) => onChange(event.target.value.trim() ? [event.target.value.trim()] : [])} />;
  const options = normalizeOptions(question.options, question.questionType);
  return <div className="mt-6 space-y-3">{options.map((option) => {
    const checked = selected.includes(option.value);
    return <button key={option.value} className={cn('flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-moss-200', checked ? 'border-moss-500 bg-moss-50' : 'border-stone-200 bg-white')} onClick={() => question.questionType === 'MULTIPLE_CORRECT' ? onChange(checked ? selected.filter((value) => value !== option.value) : [...selected, option.value]) : onChange([option.value])}><span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold', checked ? 'border-moss-700 bg-moss-700 text-white' : 'border-stone-300')}>{checked ? '✓' : ''}</span><span className="text-sm leading-6">{option.label}</span></button>;
  })}</div>;
};

const normalizeSelected = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const normalizeOptions = (value: unknown, type: EngineQuestion['questionType']) => {
  if (type === 'TRUE_FALSE') return [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }];
  if (Array.isArray(value)) return value.map((item, index) => typeof item === 'string' ? { value: String.fromCharCode(65 + index), label: item } : { value: String((item as { value?: string; id?: string }).value ?? (item as { id?: string }).id ?? String.fromCharCode(65 + index)), label: String((item as { label?: string; text?: string }).label ?? (item as { text?: string }).text ?? JSON.stringify(item)) });
  return [];
};
const patchAnswer = (answers: Record<string, LocalAnswer>, id: string, patch: Partial<LocalAnswer>) => ({ ...answers, [id]: { ...answers[id], ...patch } });
const buildSectionTimes = (questions: EngineQuestion[], answers: Record<string, LocalAnswer>) => Object.values(questions.reduce<Record<string, { sectionId: string; timeTakenSeconds: number }>>((acc, question) => {
  const sectionId = question.sectionId ?? 'rc';
  acc[sectionId] ??= { sectionId, timeTakenSeconds: 0 };
  acc[sectionId].timeTakenSeconds += answers[question.id]?.timeTakenSeconds ?? 0;
  return acc;
}, {}));
const questionStatus = (answer?: LocalAnswer) => !answer?.visited ? 'not-visited' : answer.selectedAnswers.length && answer.markedForReview ? 'answered-marked' : answer.markedForReview ? 'marked' : answer.selectedAnswers.length ? 'answered' : 'not-answered';
const paletteClass = (status: string) => status === 'answered' ? 'bg-moss-700 text-white' : status === 'answered-marked' ? 'bg-purple-500 text-white' : status === 'marked' ? 'bg-amber text-white' : status === 'not-answered' ? 'bg-red-500 text-white' : 'bg-stone-200 text-stone-700';
const canNavigateTo = (engine: EnginePayload, currentIndex: number, nextIndex: number) => {
  if (nextIndex < 0 || nextIndex >= engine.test.questions.length) return false;
  const current = engine.test.questions[currentIndex];
  const next = engine.test.questions[nextIndex];
  if (current.sectionId !== next.sectionId && !engine.test.canGoBackBetweenSections) return nextIndex > currentIndex;
  const section = engine.test.sections.find((item) => item.id === current.sectionId);
  if (current.sectionId === next.sectionId && section && !section.canGoBackToPreviousQuestion) return nextIndex >= currentIndex;
  return true;
};
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const Legend = ({ color, label, value }: { color: string; label: string; value: number }) => <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className={cn('size-3 rounded-full', color)} />{label}</span><b>{value}</b></div>;
