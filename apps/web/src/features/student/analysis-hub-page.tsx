import { BarChart3, BookOpenText, ClipboardList, ScrollText, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card } from '../../components/ui/card';

const analysisLinks = [
  {
    title: 'Analyze mock tests',
    description: 'View every submitted mock attempt across exam types and open individual analysis.',
    to: '/student/analysis/mock-tests',
    icon: ClipboardList,
    tone: 'bg-moss-50 text-moss-800',
  },
  {
    title: 'Analyze mentorship',
    description: 'View submitted batch tests across mentorship programs and batches.',
    to: '/student/analysis/mentorship',
    icon: UsersRound,
    tone: 'bg-lime/35 text-moss-900',
  },
  {
    title: 'Analyze RC',
    description: 'View RC score trends, recent attempts and leaderboard performance.',
    to: '/student/rc',
    icon: ScrollText,
    tone: 'bg-sky-50 text-sky-800',
  },
  {
    title: 'Analyze content tests',
    description: 'Open your existing topic-test practice history.',
    to: '/student/content?view=attempts',
    icon: BookOpenText,
    tone: 'bg-amber/20 text-[#8a6017]',
  },
];

export const AnalysisHubPage = () => (
  <div className="space-y-7">
    <section className="overflow-hidden rounded-3xl bg-moss-800 p-7 text-white shadow-card">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-lime">Analysis center</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Choose what you want to analyze</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-100/75">This hub only routes you to analysis areas already built across mocks, mentorship, RC and content.</p>
    </section>

    <div className="grid gap-4 md:grid-cols-2">
      {analysisLinks.map(({ title, description, to, icon: Icon, tone }) => (
        <Link key={title} to={to} className="block">
          <Card className="h-full p-5 transition hover:-translate-y-px hover:shadow-card">
            <div className="flex items-start gap-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon size={21} /></span>
              <div>
                <h2 className="text-lg font-bold text-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>
              </div>
              <BarChart3 size={18} className="ml-auto shrink-0 text-moss-700" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  </div>
);
