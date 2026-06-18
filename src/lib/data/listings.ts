import { createSupabasePublicClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import type { AreaDisplaySource } from "@/lib/area-format";
import type { MultiPolygon, Polygon } from "geojson";
export { formatPrice, listingImageUrl } from "@/lib/listing-display";

export type PublicBoundaryGeojson = Polygon | MultiPolygon;

export type ListingCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  listing_type_slug: string;
  listing_type_label: string;
  country_code: string;
  country_name: string;
  admin_area_code: string | null;
  admin_area_name: string | null;
  region_slug: string;
  nearest_town: string | null;
  public_lat: number;
  public_lng: number;
  public_boundary_geojson?: PublicBoundaryGeojson | null;
  area_acres: number;
  area_hectares: number;
  area_display_source?: AreaDisplaySource | null;
  price_cents: number | null;
  currency: string;
  price_unit: "per_day" | "per_week" | "per_season" | "per_request";
  cover_image_path: string | null;
  featured_score: number;
  published_at: string | null;
  distance_meters: number | null;
};

export type ListingDetail = ListingCard & {
  description: string | null;
  region_name: string | null;
  wildlife: string[];
  amenities: string[];
  rules: string[];
  owner_name: string | null;
};

export type LegalRegion = {
  id: string;
  country_code: string;
  country_name: string;
  country_slug: string;
  admin_area_code: string | null;
  admin_area_name: string | null;
  admin_area_slug: string | null;
  region_slug: string;
  seo_title: string | null;
  seo_description: string | null;
  access_terms: string | null;
  firearm_notice: string | null;
  min_booking_notice_days: number;
};

export type ListingType = {
  id: string;
  slug: string;
  label: string;
  description: string;
};

export type DataResult<T> = {
  data: T;
  error: string | null;
};

const missingSupabaseMessage =
  "Connect Supabase environment variables to load live marketplace data.";

function getClient() {
  if (!hasSupabaseBrowserEnv()) {
    return null;
  }

  return createSupabasePublicClient();
}

export async function getListingTypes(): Promise<DataResult<ListingType[]>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: [], error: missingSupabaseMessage };
  }

  const { data, error } = await supabase
    .from("listing_types")
    .select("id, slug, label, description")
    .eq("active", true)
    .order("sort_order");

  return {
    data: (data ?? []) as ListingType[],
    error: error?.message ?? null,
  };
}

export async function getLegalRegions(): Promise<DataResult<LegalRegion[]>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: [], error: missingSupabaseMessage };
  }

  const { data, error } = await supabase
    .from("legal_region_configs")
    .select(
      "id, country_code, country_name, country_slug, admin_area_code, admin_area_name, admin_area_slug, region_slug, seo_title, seo_description, access_terms, firearm_notice, min_booking_notice_days",
    )
    .eq("market_enabled", true)
    .order("country_name")
    .order("admin_area_name", { nullsFirst: true });

  return {
    data: (data ?? []) as LegalRegion[],
    error: error?.message ?? null,
  };
}

export async function getRegionBySlugs(
  country: string,
  state?: string,
): Promise<DataResult<LegalRegion | null>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: null, error: missingSupabaseMessage };
  }

  let query = supabase
    .from("legal_region_configs")
    .select(
      "id, country_code, country_name, country_slug, admin_area_code, admin_area_name, admin_area_slug, region_slug, seo_title, seo_description, access_terms, firearm_notice, min_booking_notice_days",
    )
    .eq("country_slug", country)
    .eq("market_enabled", true);

  query = state
    ? query.eq("admin_area_slug", state)
    : query.is("admin_area_slug", null);

  const { data, error } = await query.maybeSingle();

  return {
    data: (data as LegalRegion | null) ?? null,
    error: error?.message ?? null,
  };
}

export async function getFeaturedListingsByRegion(params: {
  countryCode: string;
  adminAreaCode?: string | null;
  regionSlug?: string | null;
  limit?: number;
}): Promise<DataResult<ListingCard[]>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: [], error: missingSupabaseMessage };
  }

  const { data, error } = await supabase.rpc("get_featured_listings_by_region", {
    p_country_code: params.countryCode,
    p_admin_area_code: params.adminAreaCode ?? null,
    p_region_slug: params.regionSlug ?? null,
    p_limit: params.limit ?? 8,
  });

  return {
    data: (data ?? []) as ListingCard[],
    error: error?.message ?? null,
  };
}

export async function searchListingsByRadius(params: {
  countryCode?: string | null;
  lat: number;
  lng: number;
  radiusMeters?: number;
  listingTypes?: string[];
  minAreaAcres?: number | null;
  maxPriceCents?: number | null;
  limit?: number;
  offset?: number;
}): Promise<DataResult<ListingCard[]>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: [], error: missingSupabaseMessage };
  }

  const { data, error } = await supabase.rpc("search_listings_by_radius", {
    p_country_code: params.countryCode ?? null,
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_meters: params.radiusMeters ?? 50000,
    p_listing_type_slugs: params.listingTypes?.length ? params.listingTypes : null,
    p_min_area_acres: params.minAreaAcres ?? null,
    p_max_price_cents: params.maxPriceCents ?? null,
    p_limit: params.limit ?? 24,
    p_offset: params.offset ?? 0,
  });

  return {
    data: (data ?? []) as ListingCard[],
    error: error?.message ?? null,
  };
}

export async function searchListingsByRegion(params: {
  countryCode?: string | null;
  adminAreaCode?: string | null;
  listingTypes?: string[];
  minAreaAcres?: number | null;
  maxPriceCents?: number | null;
  limit?: number;
  offset?: number;
}): Promise<DataResult<ListingCard[]>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: [], error: missingSupabaseMessage };
  }

  const { data, error } = await supabase.rpc("search_listings_by_region", {
    p_country_code: params.countryCode ?? "US",
    p_admin_area_code: params.adminAreaCode ?? null,
    p_listing_type_slugs: params.listingTypes?.length
      ? params.listingTypes
      : null,
    p_min_area_acres: params.minAreaAcres ?? null,
    p_max_price_cents: params.maxPriceCents ?? null,
    p_limit: params.limit ?? 24,
    p_offset: params.offset ?? 0,
  });

  if (
    error &&
    (error.code === "PGRST202" ||
      error.message.includes("search_listings_by_region"))
  ) {
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 24;
    const fallback = await getFeaturedListingsByRegion({
      countryCode: params.countryCode ?? "US",
      adminAreaCode: params.adminAreaCode ?? null,
      limit: Math.min(offset + limit, 50),
    });
    const filtered = fallback.data.filter((listing) => {
      const typeMatches =
        !params.listingTypes?.length ||
        params.listingTypes.includes(listing.listing_type_slug);
      const areaMatches =
        params.minAreaAcres === null ||
        params.minAreaAcres === undefined ||
        listing.area_acres >= params.minAreaAcres;
      const priceMatches =
        params.maxPriceCents === null ||
        params.maxPriceCents === undefined ||
        listing.price_cents === null ||
        listing.price_cents <= params.maxPriceCents;

      return typeMatches && areaMatches && priceMatches;
    });

    return {
      data: filtered.slice(offset, offset + limit),
      error: fallback.error,
    };
  }

  return {
    data: (data ?? []) as ListingCard[],
    error: error?.message ?? null,
  };
}

export async function searchListingsInBounds(params: {
  west: number;
  south: number;
  east: number;
  north: number;
  countryCode?: string | null;
  listingTypes?: string[];
  minAreaAcres?: number | null;
  maxPriceCents?: number | null;
  limit?: number;
  offset?: number;
}): Promise<DataResult<ListingCard[]>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: [], error: missingSupabaseMessage };
  }

  const { data, error } = await supabase.rpc("search_listings_in_bounds", {
    p_west: params.west,
    p_south: params.south,
    p_east: params.east,
    p_north: params.north,
    p_country_code: params.countryCode ?? null,
    p_listing_type_slugs: params.listingTypes?.length ? params.listingTypes : null,
    p_min_area_acres: params.minAreaAcres ?? null,
    p_max_price_cents: params.maxPriceCents ?? null,
    p_limit: params.limit ?? 100,
    p_offset: params.offset ?? 0,
  });

  return {
    data: (data ?? []) as ListingCard[],
    error: error?.message ?? null,
  };
}

export async function getListingDetailBySlug(
  slug: string,
): Promise<DataResult<ListingDetail | null>> {
  const supabase = getClient();

  if (!supabase) {
    return { data: null, error: missingSupabaseMessage };
  }

  const { data, error } = await supabase
    .rpc("get_listing_public_detail", { p_slug: slug })
    .maybeSingle();

  return {
    data: (data as ListingDetail | null) ?? null,
    error: error?.message ?? null,
  };
}
