import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Outbound redirects, the JSON API and personal pages carry no index
        // value and should not consume crawl budget.
        disallow: ['/go/', '/api/', '/saved', '/sign-in'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
