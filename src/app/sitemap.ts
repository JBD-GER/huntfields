import type { MetadataRoute } from "next";
import { getLegalRegions } from "@/lib/data/listings";
import { guideCategories, guidePosts } from "@/lib/guides";
import { absoluteUrl } from "@/lib/seo/site";
import { createSupabasePublicClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/land", changeFrequency: "daily", priority: 0.95 },
    { path: "/list-your-land", changeFrequency: "weekly", priority: 0.9 },
    { path: "/guides", changeFrequency: "weekly", priority: 0.55 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.65 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.5 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.5 },
    { path: "/cookies", changeFrequency: "monthly", priority: 0.5 },
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

  const guideCategoryRoutes: MetadataRoute.Sitemap = guideCategories.map(
    (category) => {
      const categoryPosts = guidePosts.filter(
        (post) => post.category === category.slug,
      );
      const latestUpdate =
        categoryPosts
          .map((post) => new Date(post.updatedAt).getTime())
          .sort((a, b) => b - a)[0] ?? Date.now();

      return {
        url: absoluteUrl(`/guides/category/${category.slug}`),
        lastModified: new Date(latestUpdate),
        changeFrequency: "monthly",
        priority: 0.5,
      };
    },
  );
  const guidePostRoutes: MetadataRoute.Sitemap = guidePosts.map((post) => ({
    url: absoluteUrl(`/guides/${post.slug}`),
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly",
    priority: 0.58,
  }));

  return [
    ...staticRoutes,
    ...regionRoutes,
    ...listingRoutes,
    ...guideCategoryRoutes,
    ...guidePostRoutes,
  ];
}
