import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <section className={cn('rounded-3xl border border-stone-200/80 bg-white shadow-card', className)} {...props} />
);

