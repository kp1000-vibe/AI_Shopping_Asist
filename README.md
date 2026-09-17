# PriceShelf

Live price comparison across the US retailers people actually shop: Amazon, Walmart, Costco,
Target, Best Buy, SHEIN, Sams Club, eBay and Home Depot.

PriceShelf ranks offers by **total landed cost** — item price plus shipping plus an estimated
sales tax for your ship-to state — and shows the buying conditions attached to each price
(membership required, Prime exclusive, Circle deal, used/renewed, out of stock, and so on).

---

## Contents

- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Getting each API key](#getting-each-api-key)
- [Scripts](#scripts)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Deploying to Vercel](#deploying-to-vercel)
- [Operational notes](#operational-notes)
- [License](#license)

---

## How it works

```
 /search?q=…
     │
     ▼
 lib/search.ts ──► Redis cache (15 min)  ──► hit: return
     │
     ├─► providers run in parallel (Promise.allSettled, 8s timeout each)
     │      ├─ serpapi.ts   Google Shopping engine (Walmart, Target, Costco, Best Buy, …)
     │      ├─ amazon.ts    Rainforest API (Amazon product data)
     │      └─ walmart.ts   Walmart affiliate catalogue via Impact
     │
     ├─► product matching   GTIN/UPC consensus, then weighted title similarity
     │                      + accessory rejection ("case for …", "charger for …")
     ├─► deduplication      one offer per retailer, cheapest wins
     └─► cache write        search payload (15 min) + each offer (24 h, for /go/[offerId])
```

A provider that fails or times out never blocks the others; the UI renders what arrived and shows
a "some stores did not respond" notice naming the ones that did not.

Every price on the site comes from a live provider response. There is no seeded or sample catalogue
in the production build — when no provider is configured the UI says so rather than inventing
numbers.

## Tech stack

| Concern          | Choice                                                     |
| ---------------- | ---------------------------------------------------------- |
| Framework        | Next.js 15 (App Router, React 19, server components)       |
| Language         | TypeScript, `strict` + `noUncheckedIndexedAccess`          |
| Styling          | Tailwind CSS 3, shadcn/ui component patterns, Radix UI     |
| Icons / font     | lucide-react, DM Sans via `next/font`                      |
| Validation       | Zod on every provider response and every inbound request   |
| Cache + limits   | Upstash Redis (Vercel KV compatible), `@upstash/ratelimit` |
| Unit / component | Vitest + React Testing Library                             |
| End to end       | Playwright (desktop + mobile projects)                     |
| Quality gates    | ESLint (flat config), Prettier, GitHub Actions             |

## Quick start

```bash
git clone https://github.com/<your-user>/priceshelf.git
cd priceshelf
npm install
cp .env.example .env.local   # then fill in whatever keys you have
npm run dev
```

Open http://localhost:3000.

With no API keys configured the site runs end to end, but search results are empty and a notice
explains that no price sources are configured. Add a single key (SerpApi is the broadest) to get
live prices.

## Environment variables

| Variable                   | Required | Purpose                                                     |
| -------------------------- | -------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`     | yes      | Canonical origin for metadata, sitemap, OG tags and JSON-LD |
| `SERPAPI_KEY`              | no\*     | Google Shopping engine — covers most retailers in one call  |
| `RAINFOREST_API_KEY`       | no\*     | Amazon product data                                         |
| `AMAZON_ASSOCIATE_TAG`     | no       | Appended as `tag=` on outbound Amazon links                 |
| `WALMART_API_KEY`          | no\*     | Impact Account SID — enables the Walmart catalogue provider |
| `WALMART_API_SECRET`       | no       | Impact Auth Token (required with `WALMART_API_KEY`)         |
| `WALMART_AFFILIATE_ID`     | no       | Sub-id placed in the Walmart deep link                      |
| `UPSTASH_REDIS_REST_URL`   | no\*\*   | Shared cache and rate limiting                              |
| `UPSTASH_REDIS_REST_TOKEN` | no\*\*   | Shared cache and rate limiting                              |
| `EBAY_CAMPAIGN_ID`         | no       | eBay Partner Network campaign id for outbound eBay links    |
| `TARGET_AFFILIATE_ID`      | no       | Sub-id placed in the Target deep link                       |
| `BESTBUY_AFFILIATE_ID`     | no       | Sub-id placed in the Best Buy deep link                     |
| `PRICESHELF_DEMO_PROVIDER` | no       | **Test only.** See [Operational notes](#operational-notes). |

\* At least one provider key is needed for the site to return any prices.

\*\* Strongly recommended in production. Without Redis, PriceShelf falls back to a per-instance
in-memory cache and rate limiter, which is not shared between serverless instances.

### Affiliate deep links

Amazon and eBay publish query-parameter tracking schemes, so those are built in. Walmart, Target
and Best Buy run on the Impact network, which issues a publisher-specific deep-link host. Supply it
as an optional template containing `{url}` and `{subId}` placeholders:

```bash
WALMART_DEEPLINK_TEMPLATE="https://goto.walmart.com/c/<pubId>/<campaignId>/<adId>?u1={subId}&url={url}"
TARGET_DEEPLINK_TEMPLATE="https://goto.target.com/c/<pubId>/<campaignId>/<adId>?u1={subId}&url={url}"
BESTBUY_DEEPLINK_TEMPLATE="https://bestbuy.7tiv.net/c/<pubId>/<campaignId>/<adId>?u1={subId}&url={url}"
```

Without a template, PriceShelf sends the shopper to the plain retailer URL. It never fabricates a
tracking link.

## Getting each API key

### SerpApi (Google Shopping) — the highest-value single key

1. Sign up at <https://serpapi.com/users/sign_up>.
2. Open <https://serpapi.com/manage-api-key> and copy the private key.
3. Set `SERPAPI_KEY`.

The free tier includes a small monthly search allowance; PriceShelf caches every query for 15
minutes, which keeps usage low.

### Rainforest API (Amazon)

1. Sign up at <https://www.rainforestapi.com/>.
2. Dashboard → **API Credentials** → copy the API key.
3. Set `RAINFOREST_API_KEY`.

### Amazon Associates tag

1. Apply at <https://affiliate-program.amazon.com/>.
2. After approval, find your tracking id (looks like `yourname-20`) under **Account Settings →
   Manage Tracking IDs**.
3. Set `AMAZON_ASSOCIATE_TAG`.

### Walmart affiliate (Impact)

1. Apply to the Walmart programme at <https://impact.com/> (Walmart runs its affiliate programme
   on Impact).
2. In the Impact dashboard, open **Settings → API** and copy the **Account SID** and **Auth
   Token**.
3. Set `WALMART_API_KEY` (Account SID) and `WALMART_API_SECRET` (Auth Token).
4. For outbound links, copy a Walmart deep link from Impact and turn it into
   `WALMART_DEEPLINK_TEMPLATE` as shown above.

### eBay Partner Network

1. Apply at <https://partnernetwork.ebay.com/>.
2. Copy your **Campaign ID** from the dashboard.
3. Set `EBAY_CAMPAIGN_ID`.

### Upstash Redis (or Vercel KV)

**Upstash directly:**

1. Create a database at <https://console.upstash.com/redis>.
2. On the database page, copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

**Through Vercel:**

1. Vercel dashboard → your project → **Storage** → **Create Database** → **Upstash Redis**.
2. Vercel injects the `UPSTASH_REDIS_REST_*` variables into the project automatically.

## Scripts

| Script                  | What it does                                          |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Development server on port 3000                       |
| `npm run build`         | Production build                                      |
| `npm run start`         | Serve the production build                            |
| `npm run lint`          | ESLint over the whole repo                            |
| `npm run typecheck`     | `tsc --noEmit`                                        |
| `npm run format`        | Prettier write                                        |
| `npm run format:check`  | Prettier check (used in CI)                           |
| `npm test`              | Vitest unit + component suite                         |
| `npm run test:coverage` | Vitest with v8 coverage and an 80% threshold          |
| `npm run test:e2e`      | Playwright suite (builds are expected to exist first) |

## Testing

```bash
npm run test:coverage          # unit + component
npm run build                  # Playwright serves the production build
npx playwright install --with-deps chromium
PRICESHELF_DEMO_PROVIDER=1 npm run test:e2e
```

The Playwright config starts `npm run start` with `PRICESHELF_DEMO_PROVIDER=1` automatically, so
end-to-end runs never need real API keys or spend provider quota.

Coverage is enforced at 80% for lines, statements, branches and functions across `src/lib` and
`src/components`.

## Project structure

```
src/
  app/
    page.tsx                 home: hero bento, trending, categories, retailer strip
    search/page.tsx          server-rendered results (indexable)
    product/[slug]/page.tsx  ISR product comparison page + JSON-LD
    go/[offerId]/route.ts    click logging + 302 redirect with affiliate tag
    api/search/route.ts      JSON search API, rate limited to 30 req/min/IP
    api/suggest/route.ts     debounced search suggestions
    about | privacy | terms | affiliate-disclosure | sign-in | saved
    sitemap.ts | robots.ts | not-found.tsx | error.tsx | global-error.tsx
  components/                app components + shadcn/ui primitives in ui/
  lib/
    providers/               serpapi.ts, amazon.ts, walmart.ts, demo.ts, index.ts
    search.ts                cache → providers → match → dedupe pipeline
    normalize.ts             money parsing, title similarity, dedupe, GTIN
    total-cost.ts            state sales tax table, landed cost, formatting
    conditions.ts            buying-condition detection and badge copy
    offers.ts                filtering, sorting, URL state
    cache.ts | rate-limit.ts | affiliate.ts | seo.ts | types.ts
e2e/                         Playwright specs (search, redirect, site, a11y, mobile)
```

## Deploying to Vercel

### 1. Create the repository and push

```bash
git init -b main
git add .
git commit -m "feat: PriceShelf price comparison app"
```

Create the GitHub repo and push (requires the [GitHub CLI](https://cli.github.com/)):

```bash
gh repo create priceshelf --public --source=. --remote=origin --push
```

Or, without the CLI: create an empty repo at <https://github.com/new>, then

```bash
git remote add origin https://github.com/<your-user>/priceshelf.git
git push -u origin main
```

### 2. Import into Vercel

```bash
npm i -g vercel
vercel login
vercel link
```

Or use the dashboard: <https://vercel.com/new> → **Import Git Repository** → pick the repo.
Framework preset, build command and output directory are detected automatically.

### 3. Add the environment variables

```bash
vercel env add NEXT_PUBLIC_SITE_URL production
vercel env add SERPAPI_KEY production
vercel env add RAINFOREST_API_KEY production
vercel env add AMAZON_ASSOCIATE_TAG production
vercel env add WALMART_AFFILIATE_ID production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

Each command prompts for the value. Repeat with `preview` (and `development` if you want
`vercel dev`) for any variable you need in those environments.

For Redis, the easier path is Vercel dashboard → project → **Storage** → **Create Database** →
**Upstash Redis**, which injects the two Upstash variables for you.

### 4. Deploy to production

```bash
vercel --prod
```

Vercel prints the production URL when the deployment finishes. After the first deploy, set
`NEXT_PUBLIC_SITE_URL` to that URL (or your custom domain) and redeploy so canonical URLs, the
sitemap and OG tags point at the right origin:

```bash
vercel env rm NEXT_PUBLIC_SITE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production   # enter https://your-domain.com
vercel --prod
```

### 5. Verify

```bash
curl -I https://your-domain.com                       # 200 + security headers
curl https://your-domain.com/robots.txt
curl https://your-domain.com/sitemap.xml
curl "https://your-domain.com/api/search?q=AirPods+Pro+2" | head -c 400
```

## Measured Lighthouse scores

Measured against a local production build (`next build && next start`) with Lighthouse 12 and
Chromium 153, using the fixture provider so every page had a full set of offers:

| Page                      | Preset  | Perf | A11y | Best practices | SEO | LCP   | CLS   | TBT    |
| ------------------------- | ------- | ---- | ---- | -------------- | --- | ----- | ----- | ------ |
| `/`                       | desktop | 100  | 100  | 100            | 100 | 0.6 s | 0.003 | 0 ms   |
| `/search?q=AirPods Pro 2` | desktop | 100  | 100  | 100            | 100 | 0.6 s | 0.000 | 0 ms   |
| `/product/airpods-pro-2`  | desktop | 100  | 100  | 100            | 100 | 0.5 s | 0.006 | 0 ms   |
| `/about`                  | desktop | 100  | 100  | 100            | 100 | 0.5 s | 0.002 | 0 ms   |
| `/`                       | mobile  | 98   | 100  | 100            | 100 | 2.2 s | 0.002 | 110 ms |
| `/search?q=AirPods Pro 2` | mobile  | 98   | 100  | 100            | 100 | 2.3 s | 0.000 | 100 ms |

Scores on a real deployment will differ, mainly because live product images are fetched from
retailer CDNs rather than being absent. Re-measure after deploying.

Two decisions came out of these runs:

- The filled-button purple is `#7C3AED` (violet-600), not the lighter `#8B5CF6`. White text on
  `#8B5CF6` is 3.5:1 and fails WCAG AA; on `#7C3AED` it is 5.7:1. The lighter brand violet is still
  used as a non-text accent (logo corner, hero artwork).
- Retailer names render in the foreground colour beside a brand-coloured dot. Amazon orange, eBay
  red and Home Depot orange as _text_ on a light background are all below 4.5:1.
- `htmlLimitedBots: /.*/` in `next.config.mjs` keeps metadata blocking. `generateMetadata` on
  `/search` awaits `searchParams`, which makes it async, and Next then streams the tags into
  `<body>` instead of `<head>`. Our metadata does no I/O, so blocking costs nothing and keeps
  title, description and canonical in `<head>` for every crawler.

## Operational notes

- **Caching.** Search payloads are cached for 15 minutes; individual offers for 24 hours so
  `/go/[offerId]` links stay resolvable. Empty result sets are never cached, so a transient outage
  cannot pin an empty page.
- **Rate limiting.** `/api/search` allows 30 requests per minute per IP and returns `429` with
  `Retry-After` beyond that. Server-rendered pages are not rate limited.
- **Security headers.** CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, HSTS and a
  restrictive `Permissions-Policy` are set in `next.config.mjs`. Outbound clicks are sent with
  `Referrer-Policy: no-referrer` so shopper search terms never reach the retailer.
- **Outbound links.** Every "Go to store" link carries `rel="sponsored nofollow noopener"` and
  opens in a new tab, in line with the FTC disclosure on `/affiliate-disclosure`.
- **Tax estimates.** `src/lib/total-cost.ts` holds combined average state + local sales tax rates
  (Tax Foundation). They are estimates, labelled as such in the UI; the retailer charges the exact
  rate at checkout. Review the table annually.
- **Retailer logos.** PriceShelf renders retailer names as type in each brand colour rather than
  redistributing trademarked logo files.
- **`PRICESHELF_DEMO_PROVIDER`.** A fixture provider used only by the Playwright suite, so CI can
  exercise the full search → filter → redirect flow without live API keys. It is inert unless the
  variable is set to `1`, and it must never be enabled in production. Do not set it on Vercel.

## License

MIT — see [LICENSE](./LICENSE).
