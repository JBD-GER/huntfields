import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Layers3 } from "lucide-react";
import {
  getGuideCategory,
  getGuidePostsByCategory,
  guideCategories,
} from "@/lib/guides";
import {
  absoluteUrl,
  breadcrumbStructuredData,
  pageMetadata,
} from "@/lib/seo/site";

type Params = Promise<{ category: string }>;

export function generateStaticParams() {
  return guideCategories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getGuideCategory(categorySlug);

  if (!category) {
    return pageMetadata({
      title: "Guide category not found | Huntfields",
      description: "This Huntfields guide category is not available.",
      path: "/guides",
      index: false,
    });
  }

  return pageMetadata({
    title: `${category.name} | Hunting Lease Guides for Landowners`,
    description: category.description,
    path: `/guides/category/${category.slug}`,
  });
}

export default async function GuideCategoryPage({
  params,
}: {
  params: Params;
}) {
  const { category: categorySlug } = await params;
  const category = getGuideCategory(categorySlug);

  if (!category) {
    notFound();
  }

  const posts = getGuidePostsByCategory(category.slug);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${category.name} guides`,
      description: category.description,
      url: absoluteUrl(`/guides/category/${category.slug}`),
      isPartOf: {
        "@type": "WebSite",
        name: "Huntfields",
        url: absoluteUrl("/"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${category.name} articles`,
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: absoluteUrl(`/guides/${post.slug}`),
      })),
    },
    breadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: category.name, path: `/guides/category/${category.slug}` },
    ]),
  ];

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="border-b border-[#234331]/10 bg-[#101b15] text-white">
        <div className="mx-auto max-w-6xl px-3 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/76"
          >
            <Layers3 size={15} aria-hidden="true" />
            Guides
          </Link>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-normal sm:text-6xl">
            {category.name}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/72 sm:text-lg sm:leading-8">
            {category.description}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-3 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex min-w-0 flex-col rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)]"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#c76b2f]">
                <span>{category.name}</span>
                <span className="text-stone-300">/</span>
                <span className="inline-flex items-center gap-1 text-stone-500">
                  <Clock size={13} aria-hidden="true" />
                  {post.readingMinutes} min
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-black leading-tight text-stone-950">
                <Link href={`/guides/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-3 grow text-sm leading-7 text-stone-600">
                {post.excerpt}
              </p>
              <Link
                href={`/guides/${post.slug}`}
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#234331]/12 px-3 text-sm font-black text-[#183326] transition hover:bg-[#eef3ec]"
              >
                Read guide
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        <div className="rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.14)] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d99a61]">
            Owner-first marketplace
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight">
            Put this guidance into a real hunting lease listing.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68">
            Huntfields helps landowners create privacy-safe listings, define
            rules, review hunter requests, and move serious conversations toward
            agreement-ready terms.
          </p>
          <Link
            href="/list-your-land"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#183326] transition hover:bg-[#f7f3ea]"
          >
            List your hunting land
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
