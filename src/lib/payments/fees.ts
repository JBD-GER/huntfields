export const INITIAL_OWNER_FEE_BPS = 1000;
export const INITIAL_HUNTER_FEE_BPS = 500;
export const RENEWAL_OWNER_FEE_BPS = 500;
export const RENEWAL_HUNTER_FEE_BPS = 250;

export type MarketplaceFeeInput = {
  leaseAmountCents: number;
  additionalFeeCents?: number;
  isRenewal?: boolean;
};

export type MarketplaceFeeBreakdown = {
  leaseAmountCents: number;
  additionalFeeCents: number;
  ownerFeeBps: number;
  hunterFeeBps: number;
  ownerPlatformFeeCents: number;
  hunterPlatformFeeCents: number;
  landownerPayoutCents: number;
  hunterTotalCents: number;
  applicationFeeCents: number;
};

function safeCents(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.max(Math.round(value ?? 0), 0) : 0;
}

export function calculateMarketplaceFees(
  input: MarketplaceFeeInput,
): MarketplaceFeeBreakdown {
  const leaseAmountCents = safeCents(input.leaseAmountCents);
  const additionalFeeCents = safeCents(input.additionalFeeCents);
  const subtotal = leaseAmountCents + additionalFeeCents;
  const ownerFeeBps = input.isRenewal
    ? RENEWAL_OWNER_FEE_BPS
    : INITIAL_OWNER_FEE_BPS;
  const hunterFeeBps = input.isRenewal
    ? RENEWAL_HUNTER_FEE_BPS
    : INITIAL_HUNTER_FEE_BPS;
  const ownerPlatformFeeCents = Math.round((subtotal * ownerFeeBps) / 10000);
  const hunterPlatformFeeCents = Math.round((subtotal * hunterFeeBps) / 10000);

  return {
    leaseAmountCents,
    additionalFeeCents,
    ownerFeeBps,
    hunterFeeBps,
    ownerPlatformFeeCents,
    hunterPlatformFeeCents,
    landownerPayoutCents: Math.max(subtotal - ownerPlatformFeeCents, 0),
    hunterTotalCents: subtotal + hunterPlatformFeeCents,
    applicationFeeCents: ownerPlatformFeeCents + hunterPlatformFeeCents,
  };
}

export function formatBps(bps: number) {
  const percent = bps / 100;
  return Number.isInteger(percent)
    ? `${percent}%`
    : `${percent.toFixed(1).replace(/\.0$/, "")}%`;
}

export function formatMoney(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(safeCents(cents) / 100);
}
