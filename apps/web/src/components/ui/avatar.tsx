import { cn, initials } from '../../lib/utils';

export const Avatar = ({ name, src, className }: { name: string; src?: string | null; className?: string }) => (
  <div className={cn('grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-moss-100 text-xs font-bold text-moss-800', className)}>
    {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
  </div>
);

