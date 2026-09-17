import { getRetailer, type RetailerId } from '@/lib/retailers';
import { cn } from '@/lib/utils';

interface RetailerNameProps {
  retailer: RetailerId;
  className?: string;
}

/**
 * Retailer name with a brand-coloured dot.
 *
 * The brand colours themselves (Amazon orange, eBay red, Home Depot orange)
 * do not reach a 4.5:1 contrast ratio as text on a light background, so the
 * colour carries as a decorative dot and the name uses the foreground colour.
 */
export function RetailerName({ retailer, className }: RetailerNameProps) {
  const { name, color } = getRetailer(retailer);

  return (
    <span className={cn('inline-flex items-center gap-1.5 font-bold', className)}>
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
