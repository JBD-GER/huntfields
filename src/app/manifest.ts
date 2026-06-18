import type { MetadataRoute } from "next";
import { absoluteUrl, site } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} - Hunting land access marketplace`,
    short_name: site.name,
    description: site.description,
    start_url: absoluteUrl("/"),
    scope: absoluteUrl("/"),
    display: "standalone",
    background_color: "#f6f2e9",
    theme_color: "#183326",
    categories: ["business", "travel", "sports"],
    icons: [
      {
        src: "/Favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/Favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
