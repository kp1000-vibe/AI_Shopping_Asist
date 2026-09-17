/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy.
 * Retailer product images come from a long tail of retailer CDNs that changes
 * over time, so `img-src` allows any https origin. Scripts are restricted to
 * self; `unsafe-inline` is required for Next.js' inlined bootstrap/flight data
 * and `unsafe-eval` only in development for React Fast Refresh.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' https: data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `generateMetadata` on /search awaits `searchParams`, which makes metadata
  // async; Next then streams the tags into <body> instead of <head>. Our
  // metadata does no I/O, so blocking on it costs nothing and keeps title,
  // description and canonical in <head> for every crawler.
  htmlLimitedBots: /.*/,
  images: {
    // Retailer image CDNs are numerous and change often; product imagery is
    // always served over https and is optimised through next/image.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 900,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
