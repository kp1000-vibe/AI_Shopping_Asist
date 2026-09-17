import { RETAILER_LIST } from '@/lib/retailers';

/**
 * Retailer wordmarks. PriceShelf does not ship third-party logo files - the
 * names are rendered as type in each retailer brand colour, which avoids
 * redistributing trademarked artwork.
 */
export function RetailerStrip() {
  return (
    <section id="stores" className="scroll-mt-24 border-y border-border bg-muted/40 py-10">
      <div className="container">
        <h2 className="text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Comparing {RETAILER_LIST.length} US retailers
        </h2>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {RETAILER_LIST.map((retailer) => (
            <li key={retailer.id}>
              <span
                className="text-lg font-bold tracking-tight opacity-80 transition-opacity hover:opacity-100 dark:opacity-90"
                style={{ color: retailer.color }}
              >
                {retailer.name}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Retailer names and marks belong to their respective owners. PriceShelf is not affiliated
          with, endorsed by, or sponsored by any retailer listed here.
        </p>
      </div>
    </section>
  );
}
