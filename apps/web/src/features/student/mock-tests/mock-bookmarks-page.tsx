import { useQuery } from '@tanstack/react-query';
import { Bookmark, ChevronLeft, FileBarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { formatDateTime } from '../../../lib/utils';
import { MockTestsHeader } from './mock-tests-nav';

type BookmarkRow = {
  id: string;
  attemptId: string;
  test: { id: string; name: string; examType: { name: string }; mockExamType: { name: string } };
  submittedAt: string | null;
  question: string;
  status: string;
  marksAwarded: number;
  section: string;
  difficulty: string;
  topic: string;
  subtopic: string;
};

export const MockBookmarksPage = () => {
  const query = useQuery({ queryKey: ['mock-bookmarks'], queryFn: () => api<{ bookmarks: BookmarkRow[] }>('/api/v1/mock-tests/bookmarks').then((response) => response.bookmarks) });

  if (query.isLoading) return <Skeleton className="h-[560px]" />;

  const rows = query.data ?? [];
  return (
    <div className="space-y-7">
      <MockTestsHeader eyebrow="Mock revision" title="Bookmarked questions" description="All questions you bookmarked while reviewing submitted mock attempts." crumbs={[{ label: 'Mock tests', to: '/student/mock-tests' }, { label: 'Bookmarks' }]} />
      <Link to="/student/mock-tests" className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700"><ChevronLeft size={16} />Back to mock tests</Link>
      {rows.length ? (
        <div className="space-y-4">
          {rows.map((row) => (
            <Link key={row.id} to={`/student/mock-tests/attempts/${row.attemptId}/analysis`} className="block">
              <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2"><Badge className="bg-moss-100 text-moss-800"><Bookmark size={13} />Saved</Badge><Badge>{row.status.replace('_', ' ')}</Badge></div>
                    <h2 className="mt-3 line-clamp-2 font-bold">{row.question}</h2>
                    <p className="mt-2 text-sm text-stone-500">{row.test.name} · {row.section} · {row.topic} / {row.subtopic}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold text-moss-800">{row.marksAwarded} marks</p>
                    <p className="text-xs text-stone-400">{row.submittedAt ? formatDateTime(row.submittedAt) : 'Submitted attempt'}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : <EmptyState icon={FileBarChart2} title="No bookmarked mock questions" description="Open any submitted mock analysis and bookmark questions you want to revise later." />}
    </div>
  );
};
