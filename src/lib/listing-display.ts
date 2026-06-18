import type { ListingCard } from "@/lib/data/listings";
import { formatAreaDisplay } from "@/lib/area-format";

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function listingImageUrl(path: string | null | undefined, slug?: string) {
  if (!path) {
    return slug ? `/api/listings/${slug}/cover` : null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return path;
  }

  if (!publicSupabaseUrl) {
    return null;
  }

  return `${publicSupabaseUrl}/storage/v1/object/public/listing-images/${path}`;
}

export function formatPrice(
  listing: Pick<ListingCard, "price_cents" | "currency" | "price_unit">,
) {
  if (listing.price_cents === null) {
    return "Request pricing";
  }

  const amount = new Intl.NumberFormat("en", {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  }).format(listing.price_cents / 100);

  const unitLabel = {
    per_day: "day",
    per_week: "week",
    per_season: "season",
    per_request: "request",
  }[listing.price_unit];

  return `${amount} / ${unitLabel}`;
}

const acreRangeFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0,
});

function unitLabel(
  listing: Pick<ListingCard, "price_unit">,
) {
  return {
    per_day: "day",
    per_week: "week",
    per_season: "season",
    per_request: "request",
  }[listing.price_unit];
}

export function formatPriceRange(
  listing: Pick<ListingCard, "price_cents" | "currency" | "price_unit">,
) {
  if (listing.price_cents === null) {
    return "Pricing after request";
  }

  const amount = listing.price_cents / 100;
  const thresholds = [250, 500, 1000, 2500, 5000, 10000, 20000, 50000];
  const upper = thresholds.find((threshold) => amount <= threshold);
  const unit = unitLabel(listing);
  const currencyFormatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  });

  if (!upper) {
    return `${currencyFormatter.format(50000)}+ / ${unit}`;
  }

  const lowerIndex = thresholds.indexOf(upper) - 1;
  const lower = lowerIndex >= 0 ? thresholds[lowerIndex] : 0;

  if (lower === 0) {
    return `Under ${currencyFormatter.format(upper)} / ${unit}`;
  }

  return `${currencyFormatter.format(lower)}-${currencyFormatter.format(upper)} / ${unit}`;
}

export function formatPriceForViewer(
  listing: Pick<ListingCard, "price_cents" | "currency" | "price_unit">,
  viewerCanSeeDetails: boolean,
) {
  return viewerCanSeeDetails ? formatPrice(listing) : formatPriceRange(listing);
}

export function formatAreaRange(
  listing: Pick<ListingCard, "area_acres">,
) {
  const acres = Number(listing.area_acres);

  if (!Number.isFinite(acres) || acres <= 0) {
    return "Area after request";
  }

  const thresholds = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const upper = thresholds.find((threshold) => acres <= threshold);

  if (!upper) {
    return `${acreRangeFormatter.format(10000)}+ acres`;
  }

  const lowerIndex = thresholds.indexOf(upper) - 1;
  const lower = lowerIndex >= 0 ? thresholds[lowerIndex] : 0;

  if (lower === 0) {
    return `Under ${acreRangeFormatter.format(upper)} acres`;
  }

  return `${acreRangeFormatter.format(lower)}-${acreRangeFormatter.format(upper)} acres`;
}

export function formatAreaForViewer(
  listing: Pick<
    ListingCard,
    "area_acres" | "area_hectares" | "area_display_source"
  >,
  viewerCanSeeDetails: boolean,
) {
  return viewerCanSeeDetails
    ? formatAreaDisplay(listing)
    : formatAreaRange(listing);
}
