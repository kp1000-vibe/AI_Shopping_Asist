import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        pill: 'border-transparent bg-white text-neutral-900',
        outline: 'border-border text-foreground',
        /* Buying-condition tones. Contrast checked against AA at 12px bold. */
        membership:
          'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200',
        loyalty:
          'border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200',
        shipping:
          'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200',
        neutral:
          'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200',
        danger:
          'border-red-300 bg-red-100 text-red-900 dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-200',
        best: 'border-transparent bg-primary text-primary-foreground shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
