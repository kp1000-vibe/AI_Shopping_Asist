import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Renders the wordmark in white for use on the dark hero/footer. */
  inverted?: boolean;
  href?: string;
}

/**
 * PriceShelf mark: stacked shelf blocks with a purple accent corner, next to
 * the wordmark. Pure SVG so it stays crisp and costs no extra request.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8', className)}
      role="img"
      aria-label="PriceShelf"
      focusable="false"
    >
      <rect x="2" y="2" width="12" height="12" rx="3" fill="currentColor" />
      <rect x="18" y="2" width="12" height="12" rx="3" fill="#8B5CF6" />
      <rect x="2" y="18" width="12" height="12" rx="3" fill="currentColor" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function Logo({ className, inverted = false, href = '/' }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-bold tracking-tight',
        inverted ? 'text-white' : 'text-foreground',
        className,
      )}
      aria-label="PriceShelf home"
    >
      <LogoMark className={inverted ? 'text-white' : 'text-foreground'} />
      <span className="text-xl leading-none">PriceShelf</span>
    </Link>
  );
}
