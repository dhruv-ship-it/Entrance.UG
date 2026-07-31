import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('focus-ring h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-ink placeholder:text-stone-400 hover:border-stone-300', className)} {...props} />
));
Input.displayName = 'Input';

