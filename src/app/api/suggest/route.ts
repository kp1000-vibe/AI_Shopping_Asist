import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { suggestQueries } from '@/lib/content';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
});

/**
 * Search suggestions from the curated query list. Deliberately does not hit a
 * paid provider: suggestions fire on every keystroke.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = QuerySchema.safeParse({ q: request.nextUrl.searchParams.get('q') ?? '' });

  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  return NextResponse.json(
    { suggestions: suggestQueries(parsed.data.q) },
    {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
    },
  );
}
