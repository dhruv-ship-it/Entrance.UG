import { cn } from '../../lib/utils';
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-xl bg-stone-100', className)} />;

