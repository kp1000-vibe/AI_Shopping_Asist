import { describe, expect, it } from 'vitest';
import { productPath, searchPath, slugify, titleCase, unslugify } from '@/lib/slug';

describe('slugify', () => {
  it('produces clean URL slugs', () => {
    expect(slugify('AirPods Pro 2')).toBe('airpods-pro-2');
    expect(slugify('LG C4 65" OLED')).toBe('lg-c4-65-oled');
    expect(slugify('  Nintendo   Switch  OLED  ')).toBe('nintendo-switch-oled');
  });

  it('strips accents and punctuation', () => {
    expect(slugify('Café Noir — Édition')).toBe('cafe-noir-edition');
  });

  it('truncates very long queries without a trailing dash', () => {
    const slug = slugify('a'.repeat(50) + ' ' + 'b'.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns an empty string when there is nothing to slug', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('unslugify and titleCase', () => {
  it('reverses a slug into a query', () => {
    expect(unslugify('airpods-pro-2')).toBe('airpods pro 2');
  });

  it('title cases words but leaves short acronyms alone', () => {
    expect(titleCase('airpods pro 2')).toBe('Airpods Pro 2');
    expect(titleCase('lg c4 65 oled')).toBe('Lg C4 65 Oled');
    expect(titleCase('LG OLED tv')).toBe('LG OLED Tv');
    expect(titleCase('')).toBe('');
  });
});

describe('paths', () => {
  it('builds product and search paths', () => {
    expect(productPath('AirPods Pro 2')).toBe('/product/airpods-pro-2');
    expect(searchPath('AirPods Pro 2')).toBe('/search?q=AirPods%20Pro%202');
  });
});
