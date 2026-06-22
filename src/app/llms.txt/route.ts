import { guidePosts } from "@/lib/guides";
import { absoluteUrl, site } from "@/lib/seo/site";

export const revalidate = 86400;

export function GET() {
  const body = [
    `# ${site.name}`,
    "",
    site.description,
    "",
    "## Core public pages",
    `- Home: ${absoluteUrl("/")}`,
    `- Hunting leases: ${absoluteUrl("/land")}`,
    `- List your land: ${absoluteUrl("/list-your-land")}`,
    `- Landowner guides: ${absoluteUrl("/guides")}`,
    `- FAQ: ${absoluteUrl("/faq")}`,
    `- Contact: ${absoluteUrl("/contact")}`,
    `- Privacy Policy: ${absoluteUrl("/privacy")}`,
    `- Terms of Service: ${absoluteUrl("/terms")}`,
    `- Cookie Policy: ${absoluteUrl("/cookies")}`,
    "",
    "## Landowner hunting lease guides",
    ...guidePosts.map((post) => `- ${post.title}: ${absoluteUrl(`/guides/${post.slug}`)}`),
    "",
    "## Notes",
    "- Huntfields is a US-first marketplace for hunting leases and private hunting land access.",
    "- Public maps intentionally show approximate location information.",
    "- Exact boundaries, gates, routes, and private access details are approval-gated.",
    "- Public listing prices and acreage may be displayed as ranges.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
