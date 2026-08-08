import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, Grid3X3, LoaderCircle, LogOut, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
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
  if (query.isLoading) return <div className="grid h-screen place-items-center bg-[#eef3f8]"><Skeleton className="h-[86vh] w-[92vw] rounded-2xl" /></div>;
  if (query.isError || !engine || !current || !currentAnswer) return <div className="grid h-screen place-items-center bg-[#eef3f8]"><EmptyState icon={AlertTriangle} title="Unable to open attempt" description="This attempt may be submitted, expired, or unavailable." /></div>;

  const goToQuestion = (index: number) => {
    if (!canNavigateTo(engine, currentIndex, index)) return;
    accrueCurrentQuestionTime();
    setCurrentIndex(index);
    setReviewOpen(false);
  };

  const selected = currentAnswer.selectedAnswers;
  const sectionsForPalette = engine.test.sections.length
    ? engine.test.sections
    : [{ id: 'all', name: 'Questions', sequenceNumber: 1, instructions: engine.test.instructions, durationMinutes: null, totalMarks: engine.attempt.totalMarks, canGoBackToPreviousQuestion: true, questionCount: questions.length }];
  const passage = current.comprehension?.passage ?? engine.test.rcPassage;
  const activeSectionName = current.sectionName ?? currentSection?.name ?? 'Questions';

  return (
    <div className="min-h-screen bg-[#eef3f8] text-[#202733]" style={{ fontFamily: 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <header className="sticky top-0 z-30 shadow-[0_2px_8px_rgba(30,72,112,0.18)]">
        <div className="bg-gradient-to-r from-[#2f74af] via-[#2c6da4] to-[#205b91] px-4 py-3 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">Assessment Exam Center</div>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-100">{engine.pillar} assessment center</p>
              <h1 className="truncate text-base font-extrabold tracking-tight md:text-xl">{engine.test.title}</h1>
            </div>
            <div className={cn('flex items-center gap-2 rounded-md border px-4 py-2 shadow-sm', remainingSeconds < 300 ? 'border-red-200 bg-red-50 text-red-700' : 'border-white/40 bg-white text-[#173653]')}>
              <Clock3 size={18} />
              <span className="text-xs font-bold uppercase tracking-wide">Time Left</span>
              <span className="text-xl font-black tabular-nums md:text-2xl">{formatTime(remainingSeconds)}</span>
            </div>
          </div>
        </div>

        <div className="border-b border-[#c5d2df] bg-white">
          <div className="flex min-h-12 items-stretch overflow-x-auto">
            <div className="flex items-center border-r border-[#d6dee8] px-4 text-xs font-bold uppercase tracking-wide text-slate-500">Section</div>
            {sectionsForPalette.map((section) => {
              const firstIndex = questions.findIndex((question) => section.id === 'all' || question.sectionId === section.id);
              const isActive = current.sectionId === section.id || (section.id === 'all' && !current.sectionId);
              return (
                <button
                  key={section.id}
                  disabled={firstIndex < 0 || !canNavigateTo(engine, currentIndex, firstIndex)}
                  onClick={() => goToQuestion(firstIndex)}
                  className={cn(
                    'flex items-center gap-2 border-r border-[#d6dee8] px-5 text-sm font-bold transition',
                    isActive ? 'bg-[#4f8fc8] text-white' : 'bg-[#f7fbff] text-[#2e6fa9] hover:bg-[#e7f1fb]',
                    (firstIndex < 0 || !canNavigateTo(engine, currentIndex, firstIndex)) && 'cursor-not-allowed opacity-45',
                  )}
                >
                  {section.name}
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px]', isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#2e6fa9]')}>{section.questionCount}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-101px)] gap-0 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="flex min-h-0 flex-col">
          <div className="border-b border-[#cbd8e4] bg-white px-4 py-2 text-right text-sm text-slate-600">
            Marks for correct answer <b className="text-emerald-700">{current.positiveMarks}</b>
            <span className="px-2 text-slate-300">|</span>
            Negative Marks <b className={current.negativeMarks ? 'text-red-600' : 'text-emerald-700'}>{current.negativeMarks}</b>
          </div>

          <div className="flex-1 overflow-auto p-3 md:p-5">
            <div className={cn('grid min-h-[58vh] overflow-hidden border border-[#bfcbd7] bg-white shadow-sm', passage ? 'lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]' : 'grid-cols-1')}>
              {passage && (
                <article className="max-h-[calc(100vh-230px)] overflow-auto border-b border-[#cfd8e2] bg-white lg:border-b-0 lg:border-r">
                  <div className="border-b border-[#cfd8e2] bg-[#f8fbfe] px-4 py-2 text-sm font-extrabold text-slate-700">Comprehension</div>
                  <div className="whitespace-pre-wrap px-4 py-4 text-[15px] leading-8 text-slate-700 md:px-5">{passage}</div>
                </article>
              )}

              <article className="max-h-[calc(100vh-230px)] overflow-auto bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#cfd8e2] bg-[#f8fbfe] px-4 py-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">Question No: {currentIndex + 1}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{activeSectionName} • {current.questionType.replace('_', ' ')}</p>
                  </div>
                  <button
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold transition',
                      currentAnswer.markedForReview ? 'border-purple-300 bg-purple-100 text-purple-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                    onClick={() => setAnswers((value) => patchAnswer(value, current.id, { markedForReview: !currentAnswer.markedForReview }))}
                  >
                    <Flag size={14} />
                    {currentAnswer.markedForReview ? 'Marked for review' : 'Mark for review'}
                  </button>
                </div>
                <div className="px-4 py-5 md:px-6">
                  {current.imageUrl && <img src={current.imageUrl} alt="" className="mb-5 max-h-80 rounded-lg border border-slate-200 object-contain" />}
                  <div className="whitespace-pre-wrap text-[15px] font-semibold leading-8 text-slate-800 md:text-base" style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}>{current.question}</div>
                  <QuestionInput question={current} selected={selected} onChange={(next) => setAnswers((value) => patchAnswer(value, current.id, { selectedAnswers: next, visited: true }))} />
                </div>
              </article>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-[#aebdcc] bg-[#dfe9f2] px-3 py-3 shadow-[0_-4px_14px_rgba(30,72,112,0.12)] md:px-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { setAnswers((value) => patchAnswer(value, current.id, { markedForReview: true })); goToQuestion(Math.min(questions.length - 1, currentIndex + 1)); }}>
                <Flag size={16} />
                Mark for Review & Next
              </Button>
              <Button variant="outline" onClick={() => setAnswers((value) => patchAnswer(value, current.id, { selectedAnswers: [] }))}>
                <RotateCcw size={16} />
                Clear Response
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={currentIndex === 0 || !canNavigateTo(engine, currentIndex, currentIndex - 1)} onClick={() => goToQuestion(currentIndex - 1)}>
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button className="bg-[#3d82bf] hover:bg-[#2f6fa9]" onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}>
                Save & Next
                <ChevronRight size={16} />
              </Button>
              <Button variant="danger" disabled={submit.isPending} onClick={() => { accrueCurrentQuestionTime(); setConfirmSubmit(true); }}>
                <LogOut size={16} />
                Submit
              </Button>
            </div>
          </div>
        </section>

        <aside className="border-l border-[#b7c6d5] bg-[#dff1fb] xl:sticky xl:top-[101px] xl:h-[calc(100vh-101px)] xl:overflow-auto">
          <div className="border-b border-[#b7c6d5] bg-white px-4 py-4">
            <p className="text-sm text-slate-600">You are viewing</p>
            <h2 className="mt-1 text-lg font-black text-[#173653]">{activeSectionName}</h2>
          </div>

          <div className="border-b border-[#b7c6d5] bg-[#f6fbff] px-4 py-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatusBox color="bg-[#75bd31]" label="Answered" value={statusCounts.answered} />
              <StatusBox color="bg-[#e6531b]" label="Not Answered" value={statusCounts.notAnswered} />
              <StatusBox color="bg-white" textColor="text-slate-800" label="Not Visited" value={statusCounts.notVisited} />
              <StatusBox color="bg-[#9659bf]" label="Marked" value={statusCounts.marked} />
              <StatusBox color="bg-[#7d4aba]" label="Answered & Marked" value={statusCounts.answeredMarked} wide />
            </div>
          </div>

          <div className="bg-[#4f8fc8] px-4 py-2 text-sm font-bold text-white">{activeSectionName}</div>
          <div className="p-4">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">Choose a Question</p>
            <div className="space-y-5">
              {sectionsForPalette.map((section) => {
                const sectionQuestions = questions.map((question, index) => ({ question, index })).filter((item) => section.id === 'all' || item.question.sectionId === section.id);
                return (
                  <div key={section.id} className="rounded-md border border-[#b8d2e6] bg-white/70 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2f6fa9]">{section.name}</p>
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-[#2f6fa9]">{sectionQuestions.length} qs</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {sectionQuestions.map(({ question, index }) => {
                        const state = questionStatus(answers[question.id]);
                        return (
                          <button
                            key={question.id}
                            disabled={!canNavigateTo(engine, currentIndex, index)}
                            className={cn(
                              'grid h-9 min-w-9 place-items-center border text-sm font-black shadow-sm transition hover:brightness-105',
                              paletteClass(state),
                              paletteShape(state),
                              index === currentIndex && 'outline outline-2 outline-offset-2 outline-[#173653]',
                              !canNavigateTo(engine, currentIndex, index) && 'cursor-not-allowed opacity-45',
                            )}
                            onClick={() => goToQuestion(index)}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[#b7c6d5] bg-[#eef7fd] p-3">
            <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
              <Grid3X3 size={15} />
              Review
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
              Question Paper
            </Button>
            <Button variant="outline" size="sm" className="col-span-2" onClick={() => setConfirmSubmit(true)}>
              Submit Test
            </Button>
          </div>

          <div className="p-4 text-xs leading-5 text-slate-600">
            <p className="font-bold text-slate-800">Section rules</p>
            <p className="mt-1">{currentSection?.instructions || engine.test.instructions || 'Read each question carefully before answering.'}</p>
            <p className="mt-2 font-semibold">{currentSection?.canGoBackToPreviousQuestion ? 'Previous questions can be revisited in this section.' : 'This section is forward-only after you move ahead.'}</p>
          </div>
        </aside>
      </main>

      {(reviewOpen || confirmSubmit) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#173653]/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl rounded-xl border border-[#bfcbd7] p-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6fa9]">{confirmSubmit ? 'Submit test' : 'Review answers'}</p>
                <h2 className="mt-1 text-xl font-black">{confirmSubmit ? 'Are you sure you want to submit?' : 'Question review'}</h2>
              </div>
              <Button variant="ghost" onClick={() => { setReviewOpen(false); setConfirmSubmit(false); }}>Close</Button>
            </div>
            <div className="mt-5 max-h-[54vh] space-y-4 overflow-auto pr-1">
              {sectionsForPalette.map((section) => {
                const sectionQuestions = questions.map((question, index) => ({ question, index })).filter((item) => section.id === 'all' || item.question.sectionId === section.id);
                return (
                  <div key={section.id}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#2f6fa9]">{section.name}</p>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                      {sectionQuestions.map(({ question, index }) => (
                        <button key={question.id} className={cn('grid size-10 place-items-center border text-sm font-bold', paletteClass(questionStatus(answers[question.id])), paletteShape(questionStatus(answers[question.id])))} onClick={() => goToQuestion(index)}>{index + 1}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {confirmSubmit && (
              <div className="mt-6 space-y-3">
                {submit.isError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {submit.error?.message || 'Unable to submit this test. Please try again.'}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Keep attempting</Button>
                  <Button disabled={submit.isPending} onClick={() => { accrueCurrentQuestionTime(); submit.mutate(false); }}>{submit.isPending ? <><LoaderCircle size={16} className="animate-spin" />Submitting...</> : <><CheckCircle2 size={16} />Submit now</>}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

const QuestionInput = ({ question, selected, onChange }: { question: EngineQuestion; selected: string[]; onChange: (next: string[]) => void }) => {
  if (question.questionType === 'INTEGER') {
    return (
      <input
        className="mt-6 w-full max-w-sm rounded-md border border-[#bfcbd7] bg-[#f8fbfe] px-4 py-3 text-lg font-semibold outline-none transition focus:border-[#3d82bf] focus:ring-2 focus:ring-[#9dccf4]"
        style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}
        value={selected[0] ?? ''}
        inputMode="numeric"
        placeholder="Enter integer answer"
        onChange={(event) => onChange(event.target.value.trim() ? [event.target.value.trim()] : [])}
      />
    );
  }

  const options = normalizeOptions(question.options, question.questionType);
  return (
    <div className="mt-6 space-y-3">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <button
            key={option.value}
            className={cn(
              'flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition hover:border-[#75a9d4] hover:bg-[#f7fbff]',
              checked ? 'border-[#2f74af] bg-[#e8f3fc] shadow-[inset_4px_0_0_#2f74af]' : 'border-[#d7e0ea] bg-white',
            )}
            onClick={() => question.questionType === 'MULTIPLE_CORRECT' ? onChange(checked ? selected.filter((value) => value !== option.value) : [...selected, option.value]) : onChange([option.value])}
          >
            <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center border text-[11px] font-black', question.questionType === 'MULTIPLE_CORRECT' ? 'rounded-sm' : 'rounded-full', checked ? 'border-[#2f74af] bg-[#2f74af] text-white' : 'border-slate-400 bg-white text-transparent')}>✓</span>
            <span className="text-sm font-medium leading-6 text-slate-800" style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
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
const paletteClass = (status: string) => status === 'answered' ? 'border-[#4f971c] bg-[#75bd31] text-white' : status === 'answered-marked' ? 'border-[#5f3591] bg-[#7d4aba] text-white' : status === 'marked' ? 'border-[#7746a2] bg-[#9659bf] text-white' : status === 'not-answered' ? 'border-[#b73710] bg-[#e6531b] text-white' : 'border-[#c8d0d8] bg-white text-slate-800';
const paletteShape = (status: string) => status === 'answered' || status === 'not-answered' ? 'rounded-t-md rounded-b-[14px]' : status === 'answered-marked' ? 'rounded-full ring-2 ring-emerald-400' : status === 'marked' ? 'rounded-full' : 'rounded-md';
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
const StatusBox = ({ color, textColor = 'text-white', label, value, wide = false }: { color: string; textColor?: string; label: string; value: number; wide?: boolean }) => (
  <div className={cn('flex items-center gap-2', wide && 'col-span-2')}>
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-md border border-slate-300 text-sm font-black shadow-sm', color, textColor)}>{value}</span>
    <span className="font-semibold leading-tight text-slate-700">{label}</span>
  </div>
);
