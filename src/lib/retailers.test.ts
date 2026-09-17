import { describe, expect, it } from 'vitest';
import {
  getRetailer,
  isRetailerId,
  RETAILER_IDS,
  RETAILER_LIST,
  resolveRetailer,
  resolveRetailerFromUrl,
} from '@/lib/retailers';

describe('resolveRetailer', () => {
  it('matches exact merchant names', () => {
    expect(resolveRetailer('Walmart')).toBe('walmart');
    expect(resolveRetailer('Best Buy')).toBe('bestbuy');
    expect(resolveRetailer('Home Depot')).toBe('homedepot');
  });

  it('matches merchant strings with extra decoration', () => {
    expect(resolveRetailer('amazon.com - Seller')).toBe('amazon');
    expect(resolveRetailer('Costco Wholesale')).toBe('costco');
    expect(resolveRetailer('The Home Depot')).toBe('homedepot');
  });

  it('prefers the longest matcher', () => {
    expect(resolveRetailer('Sams Club Members Mark')).toBe('samsclub');
  });

  it('handles the typographic apostrophe in Sams Club', () => {
    expect(resolveRetailer('Sam’s Club')).toBe('samsclub');
    expect(resolveRetailer("Sam's Club")).toBe('samsclub');
  });

  it('returns null for untracked merchants and empty input', () => {
    expect(resolveRetailer('Some Random Shop')).toBeNull();
    expect(resolveRetailer('')).toBeNull();
    expect(resolveRetailer(null)).toBeNull();
    expect(resolveRetailer(undefined)).toBeNull();
  });
});

describe('resolveRetailerFromUrl', () => {
  it('resolves from the hostname', () => {
    expect(resolveRetailerFromUrl('https://www.target.com/p/airpods/-/A-1')).toBe('target');
    expect(resolveRetailerFromUrl('https://us.shein.com/item-p-1.html')).toBe('shein');
  });

  it('returns null for untracked hosts and malformed URLs', () => {
    expect(resolveRetailerFromUrl('https://example.com/p/1')).toBeNull();
    expect(resolveRetailerFromUrl('nope')).toBeNull();
  });
});

describe('retailer catalogue', () => {
  it('exposes nine retailers with complete metadata', () => {
    expect(RETAILER_IDS).toHaveLength(9);
    for (const retailer of RETAILER_LIST) {
      expect(retailer.name.length).toBeGreaterThan(0);
      expect(retailer.domain).toMatch(/\./);
      expect(retailer.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(retailer.matchers.length).toBeGreaterThan(0);
    }
  });

  it('marks warehouse clubs as membership required', () => {
    expect(getRetailer('costco').membership).toBe('required');
    expect(getRetailer('samsclub').membership).toBe('required');
    expect(getRetailer('target').membership).toBeNull();
  });

  it('validates retailer ids', () => {
    expect(isRetailerId('amazon')).toBe(true);
    expect(isRetailerId('kmart')).toBe(false);
    expect(isRetailerId(7)).toBe(false);
  });
});
