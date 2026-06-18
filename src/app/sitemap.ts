import type { MetadataRoute } from "next";
import { getLegalRegions } from "@/lib/data/listings";
import { absoluteUrl } from "@/lib/seo/site";
import { createSupabasePublicClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/land",
    "/list-your-land",
    "/faq",
    "/contact",
  ].map((path) => ({
    url: absoluteUrl(path || "/"),
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  const regions = await getLegalRegions();
  const regionRoutes: MetadataRoute.Sitemap = regions.data.map((region) => ({
    url: absoluteUrl(`/land/${region.region_slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: region.admin_area_slug ? 0.75 : 0.85,
  }));

  const supabase = createSupabasePublicClient();
  const { data: listings } = supabase
    ? await supabase
        .from("listings")
        .select("slug, updated_at")
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(5000)
    : { data: [] };

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: absoluteUrl(`/listings/${listing.slug}`),
    lastModified: new Date(listing.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...regionRoutes, ...listingRoutes];
}
