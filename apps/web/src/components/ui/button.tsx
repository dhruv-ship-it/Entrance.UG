import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

export const buttonVariants = cva('focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200', {
  variants: {
    variant: {
      primary: 'bg-moss-800 text-white shadow-sm hover:bg-moss-900 active:scale-[.98]',
      secondary: 'bg-moss-100 text-moss-800 hover:bg-moss-200',
      outline: 'border border-stone-200 bg-white text-stone-700 hover:border-moss-200 hover:bg-moss-50',
      ghost: 'text-stone-600 hover:bg-moss-50 hover:text-moss-800',
      danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    },
    size: { sm: 'rounded-lg px-3 py-2 text-xs', md: '', lg: 'px-5 py-3 text-base' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';

