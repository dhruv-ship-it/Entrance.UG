import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { MockTestsHeader } from './mock-tests-nav';
import type { ExamType } from './types';

export const MockExamTypesPage = () => {
  const examTypes = useQuery({
    queryKey: ['mock-exam-types-list'],
    queryFn: () => api<{ examTypes: ExamType[] }>('/api/v1/mock-tests/exam-types'),
  });

  if (examTypes.isLoading) return <PageSkeleton />;
  if (examTypes.isError || !examTypes.data) {
    return <EmptyState icon={ClipboardList} title="Could not load exam types" description="Please refresh the page. If this keeps happening, contact support." />;
  }

  return (
    <div className="space-y-7">
      <MockTestsHeader
        eyebrow="Mock tests"
        title="Choose your exam"
        description="Select the entrance exam you are preparing for. You will pick a mock category next, then browse the tests available to you."
        crumbs={[{ label: 'Mock tests' }]}
      />
      {examTypes.data.examTypes.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {examTypes.data.examTypes.map((examType) => (
            <Link key={examType.id} to={`/student/mock-tests/${examType.id}`} className="group focus-ring block rounded-3xl">
              <Card className="flex h-full flex-col p-6 transition group-hover:border-moss-200 group-hover:shadow-float">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-moss-100 text-moss-800">
                    <ClipboardList size={20} />
                  </div>
                  <ArrowUpRight size={18} className="text-stone-300 transition group-hover:text-moss-700" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-ink">{examType.name}</h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-stone-500">{examType.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-moss-700">Browse categories</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No exam types yet" description="Exam types will appear here once they are configured by the admin team." />
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
