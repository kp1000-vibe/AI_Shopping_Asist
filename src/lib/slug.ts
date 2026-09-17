/**
 * Search queries double as product-page slugs so popular searches get a clean,
 * indexable URL: "AirPods Pro 2" -> /product/airpods-pro-2
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Turn a slug back into a human search query. */
export function unslugify(slug: string): string {
  return slug.replace(/-+/g, ' ').trim();
}

export function productPath(query: string): string {
  return `/product/${slugify(query)}`;
}

export function searchPath(query: string): string {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

/** Title Case a slug-derived query for headings, leaving acronyms intact. */
export function titleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => {
      if (word.length === 0) return word;
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
