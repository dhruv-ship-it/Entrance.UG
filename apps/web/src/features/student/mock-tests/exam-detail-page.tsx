import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Clock3, FileBarChart2, LoaderCircle, Lock, PlayCircle, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { ApiError, api } from '../../../lib/api';
import { formatDateTime } from '../../../lib/utils';
import { MockTestsHeader } from './mock-tests-nav';
import type { MockExamDetail } from './types';

export const MockExamDetailPage = () => {
  const { examTypeId = '', mockExamTypeId = '', examId = '' } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const listPath = `/student/mock-tests/${examTypeId}/${mockExamTypeId}`;

  const exam = useQuery({
    queryKey: ['mock-exam-detail', examId],
    queryFn: () => api<{ exam: MockExamDetail }>(`/api/v1/mock-tests/exams/${examId}`),
    enabled: Boolean(examId),
  });

  const startAttempt = useMutation({
    mutationFn: () => api<{ attempt: { id: string } }>(`/api/v1/mock-tests/${examId}/attempts`, { method: 'POST' }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['mock-exams-list', examTypeId, mockExamTypeId] });
      await client.invalidateQueries({ queryKey: ['mock-exam-detail', examId] });
      await client.invalidateQueries({ queryKey: ['student-overview'] });
    },
  });

  if (exam.isLoading) return <PageSkeleton />;
  if (exam.isError || !exam.data) {
    return <EmptyState icon={FileBarChart2} title="Mock test unavailable" description="This test may not exist or you may not have access to it." />;
  }

  const data = exam.data.exam;
  const inProgress = data.attempt?.status === 'IN_PROGRESS';
  const attemptError = startAttempt.error instanceof ApiError ? startAttempt.error.message : startAttempt.isError ? 'Unable to start this attempt.' : null;

  const handleStart = () => {
    if (data.isAttempted) return;
    startAttempt.mutate(undefined, {
      onSuccess: () => navigate(listPath, { replace: true, state: { startedAttempt: data.name } }),
    });
  };

  return (
    <div className="space-y-7">
      <MockTestsHeader
        eyebrow="Mock test details"
        title={data.name}
        description={data.description}
        crumbs={[
          { label: 'Mock tests', to: '/student/mock-tests' },
          { label: data.examType.name, to: `/student/mock-tests/${examTypeId}` },
          { label: data.mockExamType.name, to: listPath },
          { label: data.name },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            {data.isFree && <Badge className="bg-lime/45 text-moss-900">Free</Badge>}
            {!data.hasAccess && <Badge className="bg-stone-100 text-stone-600">Locked</Badge>}
            <Badge>{data.difficulty}</Badge>
            {data.isAttempted && <Badge className="bg-moss-100 text-moss-800">Already attempted</Badge>}
            {inProgress && <Badge className="bg-amber/15 text-[#9a6810]">In progress</Badge>}
          </div>

          <h2 className="mt-6 text-xl font-semibold">Instructions</h2>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">{data.instructions}</div>

          <h2 className="mt-8 text-xl font-semibold">Sections</h2>
          <div className="mt-4 space-y-3">
            {data.sections.map((section, index) => (
              <div key={section.id} className="rounded-2xl border border-stone-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{index + 1}. {section.name}</p>
                  <p className="text-xs font-medium text-stone-500">{section.sectionType}</p>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {section.questionCount} questions · {section.totalMarks} marks
                  {section.durationMinutes ? ` · ${section.durationMinutes} min` : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <p className="eyebrow">Test summary</p>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Duration" value={`${data.durationMinutes} minutes`} />
              <SummaryRow label="Total marks" value={`${data.totalMarks}`} />
              <SummaryRow label="Passing marks" value={data.passingMarks == null ? 'Not set' : `${data.passingMarks}`} />
              <SummaryRow label="Questions" value={`${data.totalQuestions}`} />
              <SummaryRow label="Sections" value={`${data.sectionCount}`} />
              <SummaryRow label="Students attempted" value={`${data.totalAttempts}`} />
              <SummaryRow label="Average score" value={`${data.averageScore}/${data.totalMarks}`} />
              <SummaryRow label="Section navigation" value={data.canGoBackBetweenSections ? 'Allowed between sections' : 'Forward only between sections'} />
            </div>

            {data.isAttempted && data.attempt && (
              <div className="mt-6 rounded-2xl bg-moss-50 p-4">
                <p className="text-sm font-semibold text-moss-900">Your result</p>
                <p className="mt-1 text-sm text-moss-800">
                  {data.attempt.marksScored}/{data.totalMarks} marks · {Math.round(data.attempt.accuracy)}% accuracy
                </p>
                {data.attempt.submittedAt && (
                  <p className="mt-1 text-xs text-stone-500">Submitted {formatDateTime(data.attempt.submittedAt)}</p>
                )}
              </div>
            )}

            {attemptError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{attemptError}</p>}

            <div className="mt-6 space-y-2">
              {!data.hasAccess ? (
                <Button disabled className="w-full" variant="secondary">
                  <Lock size={16} />
                  Locked for your account
                </Button>
              ) : data.isAttempted ? (
                <Button disabled className="w-full" variant="secondary">
                  <CheckCircle2 size={16} />
                  Already attempted
                </Button>
              ) : inProgress ? (
                <Button disabled className="w-full">
                  <ShieldCheck size={16} />
                  Attempt in progress
                </Button>
              ) : (
                <Button className="w-full" disabled={startAttempt.isPending} onClick={handleStart}>
                  {startAttempt.isPending ? <><LoaderCircle size={16} className="animate-spin" />Starting…</> : <><PlayCircle size={16} />Start attempt</>}
                </Button>
              )}
              <Link to={listPath} className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
                Back to tests
              </Link>
            </div>

            {inProgress && (
              <p className="mt-4 text-xs leading-5 text-stone-500">
                Your attempt has been created. The shared test engine UI will be connected here later.
              </p>
            )}
          </Card>

          <Card className="border-dashed bg-[linear-gradient(130deg,#f0f6e9,#fff)] p-6">
            <div className="flex gap-3">
              {data.hasAccess ? <Clock3 size={18} className="text-moss-700" /> : <Lock size={18} className="text-moss-700" />}
              <div>
                <p className="text-sm font-semibold">{data.hasAccess ? 'One attempt per test' : 'Access required to attempt'}</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  {data.hasAccess
                    ? 'Once submitted, your answers become read-only and analysis will be shown from stored attempt data.'
                    : 'You can preview the test metadata here. Attempt creation is enabled only after valid mock access is added to your account.'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3">
              <BarChart3 size={18} className="text-[#3f7f65]" />
              <div>
                <p className="text-sm font-semibold">Current cohort signal</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  {data.totalAttempts ? `${data.totalAttempts} students have attempted this mock with an average score of ${data.averageScore}.` : 'No submitted attempts yet. Analytics will start appearing after students submit this mock.'}
                </p>
              </div>
              <UsersRound size={18} className="ml-auto text-[#cf7a47]" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
    <span className="text-stone-500">{label}</span>
    <span className="font-semibold text-ink">{value}</span>
  </div>
);

const PageSkeleton = () => (
  <div className="space-y-7">
    <Skeleton className="h-28 w-full max-w-2xl" />
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Skeleton className="h-[520px]" />
      <Skeleton className="h-[420px]" />
    </div>
  </div>
);
