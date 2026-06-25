import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpenText, Clock, Layers3 } from "lucide-react";
import {
  getGuideCategory,
  guideCategories,
  guidePosts,
} from "@/lib/guides";
import {
  absoluteUrl,
  breadcrumbStructuredData,
  pageMetadata,
} from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Hunting Lease Guides for Landowners",
  description:
    "Landowner-focused hunting lease guides about pricing, lease terms, listing preparation, hunter requests, and private land access workflows.",
  path: "/guides",
});

export default function GuidesPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Huntfields Hunting Lease Guides",
      description:
        "Landowner-focused guides for hunting leases, pricing, listing preparation, terms, and hunter request screening.",
      url: absoluteUrl("/guides"),
      isPartOf: {
        "@type": "WebSite",
        name: "Huntfields",
        url: absoluteUrl("/"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Landowner hunting lease guides",
      itemListElement: guidePosts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: absoluteUrl(`/guides/${post.slug}`),
      })),
    },
    breadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
    ]),
  ];

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="border-b border-[#234331]/10 bg-[#101b15] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-3 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/76">
              <BookOpenText size={15} aria-hidden="true" />
              Landowner resource center
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal sm:text-6xl">
              Hunting lease guides for private landowners.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:text-lg sm:leading-8">
              Practical, owner-first articles about creating hunting leases,
              preparing listings, setting terms, screening requests, and
              protecting sensitive property details before access is approved.
            </p>
            <Link
              href="/list-your-land"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#183326] transition hover:bg-[#f7f3ea]"
            >
              List your land
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3 self-end rounded-lg border border-white/12 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-5">
            {guideCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/guides/category/${category.slug}`}
                className="grid gap-2 rounded-md border border-white/12 bg-white/9 p-4 transition hover:bg-white/14"
              >
                <span className="flex items-center gap-2 text-sm font-black text-white">
                  <Layers3 size={16} aria-hidden="true" />
                  {category.name}
                </span>
                <span className="text-sm leading-6 text-white/68">
                  {category.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-3 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
              Featured guides
            </p>
            <h2 className="mt-2 text-3xl font-black text-stone-950">
              Start with the owner workflow.
            </h2>
          </div>
          <Link
            href="/list-your-land"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white shadow-[0_16px_36px_rgba(24,51,38,0.18)]"
          >
            Create a listing
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {guidePosts.map((post) => {
            const category = getGuideCategory(post.category);
            return (
              <article
                key={post.slug}
                className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#234331]/10 bg-[#fffdf7] shadow-[0_18px_48px_rgba(25,35,29,0.07)]"
              >
                {post.image ? (
                  <Image
                    src={post.image.src}
                    alt={post.image.alt}
                    width={post.image.width}
                    height={post.image.height}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="aspect-[16/9] h-auto w-full object-cover"
                  />
                ) : null}
                <div className="flex grow flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#c76b2f]">
                    <span>{category?.name ?? "Guide"}</span>
                    <span className="text-stone-300">/</span>
                    <span className="inline-flex items-center gap-1 text-stone-500">
                      <Clock size={13} aria-hidden="true" />
                      {post.readingMinutes} min
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-black leading-tight text-stone-950">
                    <Link href={`/guides/${post.slug}`}>{post.title}</Link>
                  </h3>
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
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pb-10 sm:px-6 sm:pb-14 lg:px-8">
        <div className="rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.14)] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d99a61]">
            Built for landowner control
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight">
            Turn private acreage into a controlled hunting lease workflow.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68">
            Huntfields helps owners create privacy-safe hunting lease listings,
            draw huntable areas, define rules, review hunter requests, and move
            serious conversations toward agreement-ready next steps.
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
