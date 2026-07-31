import type { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';

export const EmptyState = ({ icon: Icon, title, description, compact = false }: { icon: LucideIcon; title: string; description: string; compact?: boolean }) => (
  <Card className={compact ? 'border-dashed p-6 text-center shadow-none' : 'border-dashed p-10 text-center shadow-none'}>
    <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-moss-50 text-moss-700"><Icon size={21} /></div>
    <p className="font-semibold text-ink">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-stone-500">{description}</p>
  </Card>
);

