import { getRetailer, resolveRetailer, type RetailerId } from '@/lib/retailers';
import type { ConditionCode } from '@/lib/types';

export interface ConditionInput {
  retailer: RetailerId;
  price: number;
  /** `0` means free, `null` means the provider did not report shipping. */
  shipping: number | null;
  inStock: boolean;
  title: string;
  /** Raw delivery text, e.g. "Free delivery by Tue, Mar 4". */
  deliveryText?: string | null;
  /** Promo/badge text, e.g. "Prime exclusive", "Target Circle deal". */
  tagText?: string | null;
  /** Marketplace seller name, when the provider distinguishes it. */
  sellerName?: string | null;
  /** Explicit item condition, e.g. "Used - Very Good", "Renewed". */
  conditionText?: string | null;
  /** Provider flag for Prime eligibility. */
  prime?: boolean;
  /** Provider flag for pickup-only fulfilment. */
  pickupOnly?: boolean;
}

export type BadgeTone = 'membership' | 'loyalty' | 'shipping' | 'neutral' | 'danger';

export interface ConditionBadge {
  code: ConditionCode;
  label: string;
  tone: BadgeTone;
  /** Longer explanation surfaced as a title attribute. */
  description: string;
}

/** Conditions that mean the shopper must pay for a membership to buy. */
const MEMBERSHIP_CODES: ReadonlySet<ConditionCode> = new Set<ConditionCode>([
  'membership-required',
  'prime-exclusive',
]);

export function requiresMembership(conditions: readonly ConditionCode[]): boolean {
  return conditions.some((code) => MEMBERSHIP_CODES.has(code));
}

function haystack(input: ConditionInput): string {
  return [input.deliveryText, input.tagText, input.conditionText, input.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Derive buying conditions from a provider payload. Pure and synchronous so it
 * can be unit tested against real-world provider strings.
 */
export function deriveConditions(input: ConditionInput): ConditionCode[] {
  const codes = new Set<ConditionCode>();
  const text = haystack(input);
  const retailer = getRetailer(input.retailer);

  // --- Membership -----------------------------------------------------------
  if (retailer.membership === 'required') {
    codes.add('membership-required');
    if (/non-?member|guest surcharge|\+\s*5%/.test(text)) {
      codes.add('membership-surcharge');
    }
  }

  if (input.retailer === 'amazon') {
    if (/prime[\s-]*(exclusive|only|member[\s-]*(price|deal))/.test(text)) {
      codes.add('prime-exclusive');
    } else if (input.prime === true || /\bprime\b/.test(text)) {
      codes.add('prime-shipping');
    }
  }

  if (input.retailer === 'walmart' && /walmart\s*\+|walmart plus/.test(text)) {
    codes.add('walmart-plus');
  }

  if (input.retailer === 'target' && /circle/.test(text)) {
    codes.add('circle-deal');
  }

  // --- Shipping -------------------------------------------------------------
  const freeShipping = input.shipping === 0 || /free (delivery|shipping)/.test(text);
  if (freeShipping) {
    codes.add('free-shipping');
  } else if (
    retailer.freeShippingThreshold !== undefined &&
    input.price >= retailer.freeShippingThreshold
  ) {
    codes.add('free-shipping-threshold');
  }

  // --- Item condition -------------------------------------------------------
  if (/\b(renewed|refurbished|refurb)\b/.test(text)) {
    codes.add('renewed');
  } else if (/\b(used|pre-?owned|open box|open-box)\b/.test(text)) {
    codes.add('used');
  }

  // --- Fulfilment -----------------------------------------------------------
  if (!input.inStock) {
    codes.add('out-of-stock');
  }

  if (input.pickupOnly === true || /pickup only|in-store only|store pickup only/.test(text)) {
    codes.add('pickup-only');
  }

  if (input.sellerName) {
    const sellerRetailer = resolveRetailer(input.sellerName);
    if (sellerRetailer !== input.retailer) {
      codes.add('third-party-seller');
    }
  } else if (/sold by|third[\s-]?party|marketplace seller/.test(text)) {
    codes.add('third-party-seller');
  }

  return [...codes];
}

/** Badge copy for a condition. Membership wording depends on the retailer. */
export function conditionBadge(code: ConditionCode, retailerId: RetailerId): ConditionBadge {
  const retailer = getRetailer(retailerId);

  switch (code) {
    case 'membership-required':
      return {
        code,
        tone: 'membership',
        label: `${retailer.name} membership required`,
        description: `A paid ${retailer.name} membership is needed to buy at this price.`,
      };
    case 'membership-surcharge':
      return {
        code,
        tone: 'membership',
        label: 'Non-member surcharge applies',
        description: `${retailer.name} adds a surcharge for shoppers without a membership.`,
      };
    case 'prime-exclusive':
      return {
        code,
        tone: 'membership',
        label: 'Prime exclusive price',
        description: 'This price is only available to Amazon Prime members.',
      };
    case 'prime-shipping':
      return {
        code,
        tone: 'loyalty',
        label: 'Free shipping with Prime',
        description: 'Eligible for free delivery on an Amazon Prime account.',
      };
    case 'walmart-plus':
      return {
        code,
        tone: 'loyalty',
        label: 'Free shipping with Walmart+',
        description: 'Free delivery is included with a Walmart+ subscription.',
      };
    case 'circle-deal':
      return {
        code,
        tone: 'loyalty',
        label: 'Target Circle deal',
        description: 'Price requires the free Target Circle programme.',
      };
    case 'free-shipping-threshold':
      return {
        code,
        tone: 'shipping',
        label: `Free over $${retailer.freeShippingThreshold ?? 35}`,
        description: `${retailer.name} ships free on orders above $${
          retailer.freeShippingThreshold ?? 35
        }.`,
      };
    case 'free-shipping':
      return {
        code,
        tone: 'shipping',
        label: 'Free shipping',
        description: 'Standard shipping is included in this price.',
      };
    case 'used':
      return {
        code,
        tone: 'neutral',
        label: 'Used',
        description: 'This is a pre-owned or open-box item.',
      };
    case 'renewed':
      return {
        code,
        tone: 'neutral',
        label: 'Renewed',
        description: 'This item is refurbished or factory renewed.',
      };
    case 'third-party-seller':
      return {
        code,
        tone: 'neutral',
        label: 'Third party seller',
        description: 'Sold by a marketplace seller rather than the retailer.',
      };
    case 'pickup-only':
      return {
        code,
        tone: 'neutral',
        label: 'Store pickup only',
        description: 'This price is only available for in-store collection.',
      };
    case 'out-of-stock':
      return {
        code,
        tone: 'danger',
        label: 'Out of stock',
        description: 'The retailer currently lists this item as unavailable.',
      };
  }
}

export function conditionBadges(
  conditions: readonly ConditionCode[],
  retailerId: RetailerId,
): ConditionBadge[] {
  return conditions.map((code) => conditionBadge(code, retailerId));
}
