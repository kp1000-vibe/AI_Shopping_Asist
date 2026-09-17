import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, clientIdentifier } from '@/lib/rate-limit';
import { searchOffers } from '@/lib/search';
import { SearchQuerySchema } from '@/lib/types';

export const dynamic = 'force-dynamic';

function rateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const identifier = clientIdentifier(request.headers);
  const limit = await checkRateLimit(identifier);

  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many searches. Please wait a moment and try again.' },
      {
        status: 429,
        headers: { ...rateLimitHeaders(limit), 'Retry-After': String(retryAfter) },
      },
    );
  }

  const parsed = SearchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get('q') ?? '',
    state: request.nextUrl.searchParams.get('state') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid search request',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400, headers: rateLimitHeaders(limit) },
    );
  }

  try {
    const result = await searchOffers(parsed.data.q, {
      state: parsed.data.state,
      signal: request.signal,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        ...rateLimitHeaders(limit),
        // Matches the 15 minute server cache; stale results stay usable while
        // a fresh set is fetched in the background.
        'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[api/search] unexpected failure', error);
    return NextResponse.json(
      { error: 'Price lookup failed. Please try again.' },
      { status: 502, headers: rateLimitHeaders(limit) },
    );
  }
}
