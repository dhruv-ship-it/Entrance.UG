import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { MockTestsHeader } from './mock-tests-nav';
import type { ExamType, MockExamType } from './types';

export const MockCategoriesPage = () => {
  const { examTypeId = '' } = useParams();
  const examTypes = useQuery({
    queryKey: ['mock-exam-types-list'],
    queryFn: () => api<{ examTypes: ExamType[] }>('/api/v1/mock-tests/exam-types'),
  });
  const mockExamTypes = useQuery({
    queryKey: ['mock-categories-list'],
    queryFn: () => api<{ mockExamTypes: MockExamType[] }>('/api/v1/mock-tests/mock-exam-types'),
  });

  const selectedExamType = examTypes.data?.examTypes.find((item) => item.id === examTypeId);
  const isLoading = examTypes.isLoading || mockExamTypes.isLoading;

  if (isLoading) return <PageSkeleton />;
  if (examTypes.isError || mockExamTypes.isError || !selectedExamType) {
    return <EmptyState icon={Layers3} title="Could not load mock categories" description="The selected exam type may be unavailable. Go back and choose another exam." />;
  }

  return (
    <div className="space-y-7">
      <MockTestsHeader
        eyebrow="Mock tests"
        title={`${selectedExamType.name} categories`}
        description="Mock categories are independent of exam types. Pick the kind of mock you want to attempt, such as full-length or sectional tests."
        crumbs={[
          { label: 'Mock tests', to: '/student/mock-tests' },
          { label: selectedExamType.name },
        ]}
      />
      {mockExamTypes.data?.mockExamTypes.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mockExamTypes.data.mockExamTypes.map((category) => (
            <Link
              key={category.id}
              to={`/student/mock-tests/${examTypeId}/${category.id}`}
              className="group focus-ring block rounded-3xl"
            >
              <Card className="flex h-full flex-col p-6 transition group-hover:border-moss-200 group-hover:shadow-float">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-sky/15 text-[#28718d]">
                    <Layers3 size={20} />
                  </div>
                  <ArrowUpRight size={18} className="text-stone-300 transition group-hover:text-moss-700" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-ink">{category.name}</h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-stone-500">{category.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-moss-700">View available tests</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={Layers3} title="No mock categories yet" description="Mock categories will appear here once they are configured by the admin team." />
      )}
    </div>
  );
};

const PageSkeleton = () => (
  <div className="space-y-7">
    <Skeleton className="h-28 w-full max-w-2xl" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-52" />)}
    </div>
  </div>
);
