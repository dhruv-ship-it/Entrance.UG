import { useQuery } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { BarChart3, Bookmark, CheckCircle2, Clock3, FileBarChart2, Hash, Layers, Lock, PlayCircle, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { formatDateTime } from '../../../lib/utils';
import { MockTestsHeader } from './mock-tests-nav';
import type { ExamType, MockExamSummary, MockExamType } from './types';

type CategoryAnalytics = {
  totalTests: number;
  attemptedTests: number;
  averageScore: number;
  averageOfAverages: number;
  averageAccuracy: number;
  trend: { index: number; name: string; score: number | null; averageScore: number; rank: number | null; percentile: number | null }[];
  sections: { id: string; name: string; averageScore: number; averageAccuracy: number; cohortAverageScore: number; trend: { index: number; examName: string; score: number | null; averageScore: number }[] }[];
};

export const MockExamsPage = () => {
  const { examTypeId = '', mockExamTypeId = '' } = useParams();
  const examTypes = useQuery({
    queryKey: ['mock-exam-types-list'],
    queryFn: () => api<{ examTypes: ExamType[] }>('/api/v1/mock-tests/exam-types'),
  });
  const mockExamTypes = useQuery({
    queryKey: ['mock-categories-list'],
    queryFn: () => api<{ mockExamTypes: MockExamType[] }>('/api/v1/mock-tests/mock-exam-types'),
  });
  const exams = useQuery({
    queryKey: ['mock-exams-list', examTypeId, mockExamTypeId],
    queryFn: () => api<{ exams: MockExamSummary[] }>(`/api/v1/mock-tests/exams?examTypeId=${examTypeId}&mockExamTypeId=${mockExamTypeId}`),
    enabled: Boolean(examTypeId && mockExamTypeId),
  });
  const analytics = useQuery({
    queryKey: ['mock-category-analytics', examTypeId, mockExamTypeId],
    queryFn: () => api<{ analytics: CategoryAnalytics }>(`/api/v1/mock-tests/analytics?examTypeId=${examTypeId}&mockExamTypeId=${mockExamTypeId}`).then((response) => response.analytics),
    enabled: Boolean(examTypeId && mockExamTypeId),
  });

  const selectedExamType = examTypes.data?.examTypes.find((item) => item.id === examTypeId);
  const selectedCategory = mockExamTypes.data?.mockExamTypes.find((item) => item.id === mockExamTypeId);
  const isLoading = examTypes.isLoading || mockExamTypes.isLoading || exams.isLoading;

  if (isLoading) return <PageSkeleton />;
  if (examTypes.isError || mockExamTypes.isError || exams.isError || !selectedExamType || !selectedCategory) {
    return <EmptyState icon={FileBarChart2} title="Could not load mock tests" description="The selected filters may be invalid or unavailable. Go back and try another combination." />;
  }

  return (
    <div className="space-y-7">
      <MockTestsHeader
        eyebrow="Mock tests"
        title={`${selectedCategory.name} for ${selectedExamType.name}`}
        description="These are the mock tests available under your current selection. Each test can be attempted only once."
        crumbs={[
          { label: 'Mock tests', to: '/student/mock-tests' },
          { label: selectedExamType.name, to: `/student/mock-tests/${examTypeId}` },
          { label: selectedCategory.name },
        ]}
      />
      <div className="flex justify-end">
        <Link to="/student/mock-tests/bookmarks" className={buttonVariants({ variant: 'outline' })}><Bookmark size={16} />Bookmarked questions</Link>
      </div>
      {analytics.data && <CategoryAnalyticsPanel analytics={analytics.data} />}
      {exams.data?.exams.length ? (
        <div className="space-y-4">
          {exams.data.exams.map((exam) => (
            <ExamRow
              key={exam.id}
              exam={exam}
              detailPath={`/student/mock-tests/${examTypeId}/${mockExamTypeId}/${exam.id}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileBarChart2}
          title="No mock tests available"
          description="There are no active tests for this exam and category yet."
        />
      )}
    </div>
  );
};

const ExamRow = ({ exam, detailPath }: { exam: MockExamSummary; detailPath: string }) => {
  const inProgress = exam.attempt?.status === 'IN_PROGRESS';

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{exam.name}</h2>
            {exam.isFree && <Badge className="bg-lime/45 text-moss-900">Free</Badge>}
            {!exam.hasAccess && <Badge className="bg-stone-100 text-stone-600">Locked</Badge>}
            {exam.sequenceLocked && <Badge className="bg-amber/15 text-[#9a6810]">Locked by sequence</Badge>}
            {exam.isAttempted && <Badge className="bg-moss-100 text-moss-800">Attempted</Badge>}
            {inProgress && <Badge className="bg-amber/15 text-[#9a6810]">In progress</Badge>}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{exam.description}</p>
          <p className="mt-2 line-clamp-1 text-xs leading-5 text-stone-400">{exam.instructionsPreview}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-stone-500">
            <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{exam.durationMinutes} min</span>
            <span className="inline-flex items-center gap-1.5"><Hash size={14} />{exam.totalMarks} marks</span>
            <span className="inline-flex items-center gap-1.5"><Layers size={14} />{exam.sectionCount} sections</span>
            <span className="inline-flex items-center gap-1.5"><FileBarChart2 size={14} />{exam.totalQuestions} questions</span>
            <span className="inline-flex items-center gap-1.5"><UsersRound size={14} />{exam.totalAttempts} attempted</span>
            <span className="inline-flex items-center gap-1.5"><BarChart3 size={14} />Avg {exam.averageScore}/{exam.totalMarks}</span>
            <span className="inline-flex items-center gap-1.5">Difficulty: {exam.difficulty}</span>
          </div>
          <p className="mt-3 text-xs text-stone-400">Created {formatDateTime(exam.createdAt)}</p>
          {exam.isAttempted && exam.attempt && (
            <p className="mt-3 text-sm text-moss-800">
              Scored {exam.attempt.marksScored}/{exam.totalMarks} · {Math.round(exam.attempt.accuracy)}% accuracy
              {exam.attempt.submittedAt ? ` · Submitted ${formatDateTime(exam.attempt.submittedAt)}` : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link to={detailPath} className={buttonVariants({ variant: 'outline' })}>
            View details
          </Link>
          {exam.isAttempted ? (
            <Link to={`/student/mock-tests/attempts/${exam.attempt?.id}/analysis`} className={buttonVariants({ variant: 'primary' })}>
              <CheckCircle2 size={16} />
              View analysis
            </Link>
          ) : inProgress ? (
            <Link to={detailPath} className={buttonVariants({ variant: 'primary' })}>
              <PlayCircle size={16} />
              Resume
            </Link>
          ) : exam.canAttempt ? (
            <Link to={detailPath} className={buttonVariants({ variant: 'primary' })}>
              <PlayCircle size={16} />
              Attempt
            </Link>
          ) : (
            <Button disabled variant="secondary">
              <Lock size={16} />
              {exam.sequenceLocked ? 'Attempt previous mock' : 'Locked'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

const PageSkeleton = () => (
  <div className="space-y-7">
    <Skeleton className="h-28 w-full max-w-2xl" />
    <div className="space-y-4">
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-40" />)}
    </div>
  </div>
);

const CategoryAnalyticsPanel = ({ analytics }: { analytics: CategoryAnalytics }) => (
  <Card className="overflow-hidden p-0">
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="eyebrow">Your progression</p><h2 className="text-xl font-bold">Score trend across this mock series</h2></div>
          <Badge className="bg-moss-50 text-moss-800">{analytics.attemptedTests}/{analytics.totalTests} attempted</Badge>
        </div>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" name="Your score" stroke="#164331" strokeWidth={3} connectNulls />
              <Line type="monotone" dataKey="averageScore" name="Cohort average" stroke="#d69e2e" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid gap-3">
        <MiniStat label="Your avg score" value={analytics.averageScore} />
        <MiniStat label="Cohort avg score" value={analytics.averageOfAverages} />
        <MiniStat label="Your avg accuracy" value={`${analytics.averageAccuracy}%`} />
        <div className="rounded-3xl bg-stone-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">Section signals</p>
          <div className="mt-3 space-y-2">{analytics.sections.map((section) => <div key={section.id} className="flex items-center justify-between text-sm"><span>{section.name}</span><b>{section.averageScore || 0}</b></div>)}</div>
        </div>
      </div>
    </div>
  </Card>
);

const MiniStat = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-3xl bg-moss-50 p-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-moss-700">{label}</p><p className="mt-1 text-2xl font-bold text-moss-950">{value}</p></div>;
