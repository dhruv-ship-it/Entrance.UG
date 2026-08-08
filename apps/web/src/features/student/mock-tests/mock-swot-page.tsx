import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Compass, Lightbulb, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { MockTestsHeader } from './mock-tests-nav';

type SwotPriority = 'LOW' | 'MEDIUM' | 'HIGH';
type SwotItem = {
  title: string;
  description: string;
  metric: string;
  priority: SwotPriority;
};
type Swot = {
  id: string;
  summary: string;
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  generatedAt: string;
  updatedAt: string;
};

const panels = [
  {
    key: 'strengths',
    title: 'Strengths',
    subtitle: 'What is already working',
    icon: CheckCircle2,
    shell: 'border-emerald-200 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white',
    iconClass: 'bg-emerald-600 text-white',
    accent: 'text-emerald-800',
    chip: 'bg-emerald-700 text-white',
  },
  {
    key: 'weaknesses',
    title: 'Weaknesses',
    subtitle: 'Where marks are leaking',
    icon: ShieldAlert,
    shell: 'border-rose-200 bg-gradient-to-br from-rose-100 via-rose-50 to-white',
    iconClass: 'bg-rose-500 text-white',
    accent: 'text-rose-800',
    chip: 'bg-rose-600 text-white',
  },
  {
    key: 'opportunities',
    title: 'Opportunities',
    subtitle: 'Highest-return next moves',
    icon: Lightbulb,
    shell: 'border-sky-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-white',
    iconClass: 'bg-sky-600 text-white',
    accent: 'text-sky-800',
    chip: 'bg-sky-700 text-white',
  },
  {
    key: 'threats',
    title: 'Threats',
    subtitle: 'Risks to control before next mock',
    icon: AlertTriangle,
    shell: 'border-orange-200 bg-gradient-to-br from-orange-100 via-amber-50 to-white',
    iconClass: 'bg-orange-500 text-white',
    accent: 'text-orange-900',
    chip: 'bg-orange-600 text-white',
  },
] as const;

export const MockSwotPage = () => {
  const { attemptId = '' } = useParams();
  const query = useQuery({
    queryKey: ['mock-swot', attemptId],
    queryFn: () => api<{ swot: Swot }>(`/api/v1/mock-tests/attempts/${attemptId}/swot`).then((response) => response.swot),
  });

  if (query.isLoading) return <Skeleton className="h-[720px]" />;
  if (!query.data) return <EmptyState icon={Compass} title="SWOT unavailable" description="This SWOT analysis could not be generated for the selected mock attempt." />;

  const swot = query.data;

  return (
    <div className="space-y-7">
      <MockTestsHeader
        eyebrow="Mock SWOT"
        title="Personal SWOT analysis"
        description="A focused breakdown of your strengths, weaknesses, opportunities and threats from this submitted mock."
        crumbs={[{ label: 'Mock tests', to: '/student/mock-tests' }, { label: 'SWOT analysis' }]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/student/mock-tests/attempts/${attemptId}/analysis`} className="inline-flex items-center gap-2 text-sm font-bold text-moss-700">
          <ArrowLeft size={16} /> Back to score analysis
        </Link>
        <Badge className="bg-stone-100 text-stone-600">Generated {formatDate(swot.generatedAt)}</Badge>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-5 bg-[radial-gradient(circle_at_top_left,#d9f99d_0,#14532d_38%,#0f2f24_100%)] p-7 text-white lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <Badge className="bg-white/15 text-lime">Actionable diagnosis</Badge>
            <h2 className="mt-4 text-3xl font-black tracking-tight">What this mock is telling you</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-moss-50/90">{swot.summary}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-card backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-lime text-moss-950"><Target size={22} /></span>
              <div>
                <p className="text-sm text-moss-100/80">Next best use</p>
                <p className="font-black">Review → Drill → Retest</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-moss-50/75">Use this page as your short prep brief before the next mock. It is intentionally compact, not a dump of every metric.</p>
          </div>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        {panels.map((panel) => (
          <SwotPanel key={panel.key} panel={panel} items={swot[panel.key]} />
        ))}
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-lime/25 text-moss-800"><Sparkles size={20} /></span>
            <div>
              <h3 className="font-black">Turn SWOT into revision</h3>
              <p className="text-sm text-stone-500">Open attempted answers, bookmark the key mistakes, and revise the weakest topic first.</p>
            </div>
          </div>
          <Link to={`/student/mock-tests/attempts/${attemptId}/review`} className="rounded-2xl bg-moss-800 px-5 py-3 text-sm font-bold text-white shadow-card hover:bg-moss-900">
            Open attempted answers
          </Link>
        </div>
      </Card>
    </div>
  );
};

const SwotPanel = ({ panel, items }: { panel: (typeof panels)[number]; items: SwotItem[] }) => {
  const Icon = panel.icon;
  return (
    <Card className={cn('border p-5', panel.shell)}>
      <div className="flex items-start gap-3">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm', panel.iconClass)}><Icon size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={cn('text-xl font-black', panel.accent)}>{panel.title}</h2>
            <span className={cn('rounded-full px-3 py-1 text-xs font-black', panel.chip)}>{items.length} signals</span>
          </div>
          <p className="mt-1 text-sm text-stone-600">{panel.subtitle}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((entry) => (
          <div key={`${entry.title}-${entry.metric}`} className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-stone-950">{entry.title}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">{entry.description}</p>
              </div>
              <PriorityBadge priority={entry.priority} />
            </div>
            <p className="mt-3 inline-flex rounded-full bg-stone-950 px-3 py-1 text-xs font-bold text-white">{entry.metric}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const PriorityBadge = ({ priority }: { priority: SwotPriority }) => (
  <span className={cn(
    'rounded-full px-3 py-1 text-xs font-black',
    priority === 'HIGH' && 'bg-rose-100 text-rose-700',
    priority === 'MEDIUM' && 'bg-amber-100 text-amber-700',
    priority === 'LOW' && 'bg-emerald-100 text-emerald-700',
  )}>
    {priority.toLowerCase()} priority
  </span>
);

const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
