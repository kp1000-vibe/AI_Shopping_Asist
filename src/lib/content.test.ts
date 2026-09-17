import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  findCategory,
  POPULAR_QUERIES,
  suggestQueries,
  TRENDING_QUERIES,
} from '@/lib/content';
import { slugify } from '@/lib/slug';

describe('catalogue content', () => {
  it('defines categories with unique slugs and real examples', () => {
    const slugs = CATEGORIES.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const category of CATEGORIES) {
      expect(category.examples.length).toBeGreaterThan(0);
      expect(category.examples).toContain(category.query);
      expect(slugify(category.slug)).toBe(category.slug);
    }
  });

  it('deduplicates the popular query list', () => {
    expect(new Set(POPULAR_QUERIES).size).toBe(POPULAR_QUERIES.length);
    for (const query of TRENDING_QUERIES) {
      expect(POPULAR_QUERIES).toContain(query);
    }
  });

  it('finds a category by slug', () => {
    expect(findCategory('gaming')?.name).toBe('Gaming');
    expect(findCategory('nope')).toBeUndefined();
  });
});

describe('suggestQueries', () => {
  it('needs at least two characters', () => {
    expect(suggestQueries('')).toEqual([]);
    expect(suggestQueries('a')).toEqual([]);
  });

  it('ranks prefix matches before substring matches', () => {
    const results = suggestQueries('ip');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.toLowerCase().startsWith('ip')).toBe(true);
  });

  it('is case insensitive and trims input', () => {
    expect(suggestQueries('  AIRPODS ')).toContain('AirPods Pro 2');
  });

  it('respects the limit', () => {
    expect(suggestQueries('a', 3)).toEqual([]);
    expect(suggestQueries('e', 3).length).toBeLessThanOrEqual(3);
    expect(suggestQueries('pro', 2).length).toBeLessThanOrEqual(2);
  });

  it('returns nothing for an unmatched query', () => {
    expect(suggestQueries('zzzzzzzz')).toEqual([]);
  });
});
