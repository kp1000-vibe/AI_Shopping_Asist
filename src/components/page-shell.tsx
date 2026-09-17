import Link from 'next/link';

interface PageShellProps {
  title: string;
  intro?: string;
  /** ISO date the document was last reviewed. */
  updated?: string;
  children: React.ReactNode;
}

/**
 * Format a date-only string. `new Date('2026-01-15')` is parsed as UTC
 * midnight, which renders as the previous day for anyone west of UTC, so the
 * parts are formatted directly instead.
 */
function formatReviewDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Shared layout for the static/legal pages. Keeps one h1 per page and a
 * readable measure without pulling in a typography plugin.
 */
export function PageShell({ title, intro, updated, children }: PageShellProps) {
  return (
    <div className="container max-w-3xl py-12">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {title}
          </li>
        </ol>
      </nav>

      <h1 className="text-balance text-3xl font-bold sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 text-lg text-muted-foreground">{intro}</p> : null}
      {updated ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated <time dateTime={updated}>{formatReviewDate(updated)}</time>
        </p>
      ) : null}

      <div className="mt-8 space-y-6 leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </div>
  );
}
