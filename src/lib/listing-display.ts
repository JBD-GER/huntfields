import type { ListingCard } from "@/lib/data/listings";

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
