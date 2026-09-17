import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { searchPath } from '@/lib/slug';
import { cn } from '@/lib/utils';

/**
 * Hand-drawn vector artwork for the hero cards. Inline SVG keeps the hero free
 * of extra network requests and of layout shift, which is what the LCP budget
 * needs. No third-party or stock imagery is used anywhere in the build.
 */
function ShelfArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 360"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="Illustration of shopping boxes on shelves with price tags"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="hero-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1B2830" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5F3FF" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>

      <rect width="520" height="360" fill="#151515" />
      <circle cx="420" cy="70" r="180" fill="url(#hero-glow)" />

      {/* shelves */}
      <rect x="40" y="150" width="440" height="8" rx="4" fill="#2E2E2E" />
      <rect x="40" y="272" width="440" height="8" rx="4" fill="#2E2E2E" />

      {/* upper row */}
      <rect x="72" y="86" width="86" height="64" rx="10" fill="url(#hero-box)" />
      <rect x="176" y="62" width="70" height="88" rx="10" fill="#8B5CF6" />
      <rect x="264" y="98" width="96" height="52" rx="10" fill="#E5E7EB" />
      <rect x="378" y="74" width="66" height="76" rx="10" fill="#3F3F46" />

      {/* lower row */}
      <rect x="64" y="212" width="104" height="60" rx="10" fill="#3F3F46" />
      <rect x="186" y="196" width="78" height="76" rx="10" fill="url(#hero-box)" />
      <rect x="282" y="222" width="92" height="50" rx="10" fill="#8B5CF6" opacity="0.85" />
      <rect x="392" y="204" width="60" height="68" rx="10" fill="#E5E7EB" opacity="0.9" />

      {/* price tags */}
      <g fill="#FFFFFF">
        <rect x="196" y="82" width="34" height="18" rx="9" />
        <rect x="292" y="238" width="34" height="18" rx="9" />
      </g>
      <g fill="#1A1A1A" fontFamily="sans-serif" fontSize="11" fontWeight="700">
        <text x="203" y="95">
          $
        </text>
        <text x="299" y="251">
          $
        </text>
      </g>
    </svg>
  );
}

function DeviceArt({ tone, className }: { tone: 'navy' | 'teal'; className?: string }) {
  const accent = tone === 'navy' ? '#8B5CF6' : '#5EEAD4';
  return (
    <svg
      viewBox="0 0 220 160"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={
        tone === 'navy' ? 'Illustration of a new device launch' : 'Illustration of a tablet'
      }
    >
      {tone === 'navy' ? (
        <>
          <rect x="62" y="24" width="96" height="112" rx="16" fill="#FFFFFF" opacity="0.92" />
          <rect x="74" y="40" width="72" height="66" rx="8" fill={accent} opacity="0.85" />
          <rect x="92" y="116" width="36" height="6" rx="3" fill="#1F1D36" opacity="0.5" />
        </>
      ) : (
        <>
          <rect x="44" y="20" width="132" height="120" rx="14" fill="#FFFFFF" opacity="0.92" />
          <rect x="56" y="32" width="108" height="86" rx="8" fill={accent} opacity="0.7" />
          <circle cx="110" cy="128" r="4" fill="#1B2830" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

interface HeroCardProps {
  href: string;
  pill: string;
  tagline: string;
  tone: 'navy' | 'teal';
}

function HeroSideCard({ href, pill, tagline, tone }: HeroCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex min-h-[184px] flex-col items-center justify-between overflow-hidden rounded-lg p-6',
        'transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1',
        tone === 'navy' ? 'bg-[#1F1D36]' : 'bg-[#1B2830]',
      )}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-900">
        {pill}
        <ArrowUpRight
          className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
      <div className="pointer-events-none h-24 w-full max-w-[220px]">
        <DeviceArt tone={tone} />
      </div>
      <span className="text-sm font-medium text-neutral-400">{tagline}</span>
    </Link>
  );
}

export function HeroBento() {
  return (
    <section className="bg-[#1A1A1A] py-10 sm:py-14" aria-labelledby="hero-heading">
      <div className="container">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 id="hero-heading" className="text-balance text-4xl font-bold text-white sm:text-5xl">
            One search. Every shelf price.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-neutral-400">
            Compare Amazon, Walmart, Costco, Target, Best Buy and more, with shipping, tax and
            membership rules included in the total.
          </p>
          <div className="mx-auto mt-7 max-w-xl">
            <SearchBar size="hero" placeholder="Search any product, e.g. AirPods Pro 2" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href={searchPath('AirPods Pro 2')}
            className="group relative flex min-h-[380px] flex-col justify-end overflow-hidden rounded-lg lg:col-span-2"
          >
            <div className="absolute inset-0">
              <ShelfArt />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                aria-hidden="true"
              />
            </div>
            <div className="relative p-7 sm:p-10">
              <h2 className="max-w-lg text-balance text-3xl font-bold leading-tight text-white sm:text-4xl">
                Stop paying the first price you see.
              </h2>
              <p className="mt-3 max-w-md text-sm text-neutral-300 sm:text-base">
                PriceShelf checks nine major US retailers at once and ranks them by what you
                actually pay at checkout.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 transition-transform group-hover:translate-x-0.5">
                Compare AirPods Pro 2
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          </Link>

          <div className="grid gap-4">
            <HeroSideCard
              href={searchPath('iPhone 16 Pro')}
              pill="Just Launched"
              tagline="Track the newest releases"
              tone="navy"
            />
            <HeroSideCard
              href={searchPath('iPad Air M2')}
              pill="Tablet"
              tagline="Compare every storage size"
              tone="teal"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
