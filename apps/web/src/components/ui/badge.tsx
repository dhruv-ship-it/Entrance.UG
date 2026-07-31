import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Badge = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('inline-flex items-center rounded-full bg-moss-100 px-2.5 py-1 text-[11px] font-bold text-moss-800', className)} {...props} />
);

