import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Crumb = { label: string; to?: string };

export const MockTestsNav = ({ crumbs }: { crumbs: Crumb[] }) => (
  <nav aria-label="Mock tests breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-stone-500">
    {crumbs.map((crumb, index) => (
      <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
        {index > 0 && <ChevronRight size={14} className="text-stone-300" />}
        {crumb.to ? (
          <Link to={crumb.to} className="font-medium text-moss-700 transition hover:text-moss-900">
            {crumb.label}
          </Link>
        ) : (
          <span className="font-semibold text-ink">{crumb.label}</span>
        )}
      </span>
    ))}
  </nav>
);

export const MockTestsHeader = ({ eyebrow, title, description, crumbs }: { eyebrow: string; title: string; description: string; crumbs: Crumb[] }) => (
  <div className="space-y-4">
    <MockTestsNav crumbs={crumbs} />
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{description}</p>
    </div>
  </div>
);
