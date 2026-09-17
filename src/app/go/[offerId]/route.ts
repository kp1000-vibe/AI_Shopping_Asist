import { NextResponse, type NextRequest } from 'next/server';
import { withAffiliateTag } from '@/lib/affiliate';
import { getRedis } from '@/lib/cache';
import { expiredLinkPage } from '@/lib/expired-link-page';
import { clientIdentifier } from '@/lib/rate-limit';
import { getCachedOffer } from '@/lib/search';

export const dynamic = 'force-dynamic';

const OFFER_ID_PATTERN = /^[a-z]+-[a-z0-9]{1,12}$/i;

/** Record the click. Counters are best effort and never block the redirect. */
async function logClick(offerId: string, retailer: string, request: NextRequest): Promise<void> {
  const referer = request.headers.get('referer') ?? 'direct';
  // Structured line so the platform log drain can aggregate outbound clicks.
  console.warn(
    JSON.stringify({
      event: 'outbound_click',
      offerId,
      retailer,
      referer,
      client: clientIdentifier(request.headers),
      at: new Date().toISOString(),
    }),
  );

  const redis = getRedis();
  if (!redis) return;
  try {
    const day = new Date().toISOString().slice(0, 10);
    await Promise.all([
      redis.incr(`priceshelf:clicks:offer:${offerId}`),
      redis.incr(`priceshelf:clicks:retailer:${retailer}:${day}`),
    ]);
  } catch (error) {
    console.warn('[go] click counter failed', error);
  }
}

/** 404 for an offer id we cannot resolve any more. */
function expiredResponse(): NextResponse {
  return new NextResponse(expiredLinkPage(), {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
): Promise<NextResponse> {
  const { offerId } = await params;

  if (!offerId || !OFFER_ID_PATTERN.test(offerId)) return expiredResponse();

  const offer = await getCachedOffer(offerId);
  if (!offer) return expiredResponse();

  await logClick(offer.id, offer.retailer, request);

  const destination = withAffiliateTag(offer.url, offer.retailer);

  const response = NextResponse.redirect(destination, 302);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  // Do not leak the shopper search terms to the retailer.
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
