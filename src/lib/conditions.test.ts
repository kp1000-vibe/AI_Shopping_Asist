import { describe, expect, it } from 'vitest';
import {
  conditionBadge,
  conditionBadges,
  deriveConditions,
  requiresMembership,
  type ConditionInput,
} from '@/lib/conditions';
import { CONDITION_CODES } from '@/lib/types';

function input(overrides: Partial<ConditionInput> = {}): ConditionInput {
  return {
    retailer: 'amazon',
    price: 199.99,
    shipping: null,
    inStock: true,
    title: 'AirPods Pro 2',
    ...overrides,
  };
}

describe('deriveConditions - membership', () => {
  it('always flags Costco as membership required', () => {
    expect(deriveConditions(input({ retailer: 'costco' }))).toContain('membership-required');
  });

  it('always flags Sams Club as membership required', () => {
    expect(deriveConditions(input({ retailer: 'samsclub' }))).toContain('membership-required');
  });

  it('adds a surcharge badge when the listing mentions non-member pricing', () => {
    const codes = deriveConditions(
      input({ retailer: 'costco', tagText: 'Non-member price includes a 5% surcharge' }),
    );
    expect(codes).toContain('membership-surcharge');
  });

  it('does not flag membership for open retailers', () => {
    expect(deriveConditions(input({ retailer: 'target' }))).not.toContain('membership-required');
  });
});

describe('deriveConditions - Amazon Prime', () => {
  it('detects a Prime exclusive price', () => {
    const codes = deriveConditions(input({ tagText: 'Prime exclusive deal' }));
    expect(codes).toContain('prime-exclusive');
    expect(codes).not.toContain('prime-shipping');
  });

  it('detects Prime free shipping from the flag', () => {
    expect(deriveConditions(input({ prime: true }))).toContain('prime-shipping');
  });

  it('detects Prime free shipping from delivery copy', () => {
    expect(deriveConditions(input({ deliveryText: 'FREE delivery with Prime' }))).toContain(
      'prime-shipping',
    );
  });

  it('does not apply Prime badges to other retailers', () => {
    const codes = deriveConditions(input({ retailer: 'walmart', prime: true }));
    expect(codes).not.toContain('prime-shipping');
  });
});

describe('deriveConditions - retailer programmes', () => {
  it('detects Walmart+ delivery', () => {
    const codes = deriveConditions(
      input({ retailer: 'walmart', deliveryText: 'Free delivery with Walmart+' }),
    );
    expect(codes).toContain('walmart-plus');
  });

  it('detects a Target Circle deal', () => {
    expect(
      deriveConditions(input({ retailer: 'target', tagText: 'Target Circle deal' })),
    ).toContain('circle-deal');
  });

  it('shows the free shipping threshold when shipping is not free', () => {
    const codes = deriveConditions(input({ retailer: 'target', price: 60, shipping: null }));
    expect(codes).toContain('free-shipping-threshold');
  });

  it('prefers a concrete free-shipping badge over the threshold', () => {
    const codes = deriveConditions(input({ retailer: 'target', price: 60, shipping: 0 }));
    expect(codes).toContain('free-shipping');
    expect(codes).not.toContain('free-shipping-threshold');
  });
});

describe('deriveConditions - item condition and fulfilment', () => {
  it('detects renewed items', () => {
    expect(deriveConditions(input({ conditionText: 'Renewed' }))).toContain('renewed');
  });

  it('detects used items', () => {
    expect(deriveConditions(input({ conditionText: 'Used - Very good' }))).toContain('used');
  });

  it('prefers renewed over used when both words appear', () => {
    const codes = deriveConditions(input({ conditionText: 'Used / Refurbished' }));
    expect(codes).toContain('renewed');
    expect(codes).not.toContain('used');
  });

  it('flags out of stock offers', () => {
    expect(deriveConditions(input({ inStock: false }))).toContain('out-of-stock');
  });

  it('flags store pickup only offers', () => {
    expect(deriveConditions(input({ deliveryText: 'Store pickup only' }))).toContain('pickup-only');
  });

  it('flags a marketplace seller', () => {
    expect(
      deriveConditions(input({ retailer: 'amazon', sellerName: 'GadgetWorld LLC' })),
    ).toContain('third-party-seller');
  });

  it('does not flag the retailer selling its own stock', () => {
    expect(deriveConditions(input({ retailer: 'amazon', sellerName: 'Amazon.com' }))).not.toContain(
      'third-party-seller',
    );
  });

  it('falls back to text detection for third party sellers', () => {
    expect(deriveConditions(input({ tagText: 'Sold by a marketplace seller' }))).toContain(
      'third-party-seller',
    );
  });
});

describe('requiresMembership', () => {
  it('is true only for paid-membership conditions', () => {
    expect(requiresMembership(['membership-required'])).toBe(true);
    expect(requiresMembership(['prime-exclusive'])).toBe(true);
    expect(requiresMembership(['prime-shipping', 'free-shipping'])).toBe(false);
    expect(requiresMembership([])).toBe(false);
  });
});

describe('conditionBadge', () => {
  it('names the retailer in the membership badge', () => {
    expect(conditionBadge('membership-required', 'costco').label).toBe(
      'Costco membership required',
    );
    expect(conditionBadge('membership-required', 'samsclub').label).toBe(
      'Sams Club membership required',
    );
  });

  it('uses the retailer free shipping threshold', () => {
    expect(conditionBadge('free-shipping-threshold', 'walmart').label).toBe('Free over $35');
    expect(conditionBadge('free-shipping-threshold', 'homedepot').label).toBe('Free over $45');
  });

  it('returns a label, tone and description for every condition code', () => {
    for (const code of CONDITION_CODES) {
      const badge = conditionBadge(code, 'amazon');
      expect(badge.label.length).toBeGreaterThan(0);
      expect(badge.description.length).toBeGreaterThan(0);
      expect(badge.code).toBe(code);
    }
  });

  it('maps a list of conditions to badges', () => {
    const badges = conditionBadges(['used', 'out-of-stock'], 'ebay');
    expect(badges.map((badge) => badge.label)).toEqual(['Used', 'Out of stock']);
  });
});
