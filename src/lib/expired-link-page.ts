/**
 * Standalone 404 body for the /go/[offerId] redirect.
 *
 * A Route Handler cannot render the App Router `not-found.tsx` page: it can
 * only return a Response. Rather than serving a blank 404 to someone following
 * a stale offer link, this returns a small self-contained page in the same
 * visual language, with no external requests so it works under the strict CSP.
 */
export function expiredLinkPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Offer link expired | PriceShelf</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: #ffffff;
        color: #1a1a1a;
        font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
        text-align: center;
      }
      main { max-width: 32rem; }
      .mark {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4px;
        width: 44px;
        margin: 0 auto 1.5rem;
      }
      .mark span { aspect-ratio: 1; border-radius: 6px; background: #1a1a1a; }
      .mark span:nth-child(2) { background: #8b5cf6; }
      .mark span:nth-child(4) { opacity: 0.55; }
      h1 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 0.75rem; }
      p { color: #52525b; line-height: 1.6; margin: 0 0 1.75rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        border-radius: 9999px;
        font-weight: 700;
        text-decoration: none;
      }
      .primary { background: #8b5cf6; color: #ffffff; }
      .secondary { border: 1px solid #d4d4d8; color: #1a1a1a; }
      a:focus-visible { outline: 2px solid #8b5cf6; outline-offset: 2px; }
      @media (prefers-color-scheme: dark) {
        body { background: #121212; color: #fafafa; }
        p { color: #a1a1aa; }
        .mark span { background: #fafafa; }
        .mark span:nth-child(2) { background: #8b5cf6; }
        .secondary { border-color: #3f3f46; color: #fafafa; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <h1>This offer link has expired</h1>
      <p>
        PriceShelf keeps an offer linkable for 24 hours after it is fetched, because retailer
        prices change constantly. Search again to get the current price.
      </p>
      <div class="actions">
        <a class="primary" href="/">Back to PriceShelf</a>
        <a class="secondary" href="/search">Start a new search</a>
      </div>
    </main>
  </body>
</html>`;
}
