import type { MetadataRoute } from "next";
import { getLegalRegions } from "@/lib/data/listings";
import { absoluteUrl } from "@/lib/seo/site";
import { createSupabasePublicClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/land", changeFrequency: "daily", priority: 0.95 },
    { path: "/list-your-land", changeFrequency: "weekly", priority: 0.9 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.65 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.45 },
    { path: "/llms.txt", changeFrequency: "monthly", priority: 0.2 },
  ].map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: route.priority,
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
