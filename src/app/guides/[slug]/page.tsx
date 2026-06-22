import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Clock,
  Layers3,
} from "lucide-react";
import {
  getGuideCategory,
  getGuideCategoryForPost,
  getGuidePost,
  guidePosts,
} from "@/lib/guides";
import {
  absoluteUrl,
  breadcrumbStructuredData,
  pageMetadata,
} from "@/lib/seo/site";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return guidePosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getGuidePost(slug);

  if (!post) {
    return pageMetadata({
      title: "Guide not found | Huntfields",
      description: "This Huntfields guide is not available.",
      path: "/guides",
      index: false,
    });
  }

  const base = pageMetadata({
    title: post.seoTitle,
    description: post.description,
    path: `/guides/${post.slug}`,
  });

  return {
    ...base,
    keywords: [
      post.primaryKeyword,
      ...post.secondaryKeywords,
      "hunting leases",
      "landowner hunting access",
    ],
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ["Huntfields"],
      tags: [post.primaryKeyword, ...post.secondaryKeywords],
    },
  };
}

export default async function GuidePostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getGuidePost(slug);

  if (!post) {
    notFound();
  }

  const category = getGuideCategoryForPost(post);
  const related = guidePosts
    .filter((item) => item.slug !== post.slug)
    .filter((item) => item.category === post.category)
    .concat(guidePosts.filter((item) => item.slug !== post.slug))
    .slice(0, 3);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: absoluteUrl("/opengraph-image"),
      inLanguage: "en-US",
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Organization",
        name: "Huntfields",
        url: absoluteUrl("/"),
      },
      publisher: {
        "@type": "Organization",
        name: "Huntfields",
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/logo_black.png"),
        },
      },
      mainEntityOfPage: absoluteUrl(`/guides/${post.slug}`),
      articleSection: category?.name,
      about: [
        post.primaryKeyword,
        ...post.secondaryKeywords,
        "private hunting land",
        "landowner hunting access",
      ],
      keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    breadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      {
        name: category?.name ?? "Category",
        path: `/guides/category/${category?.slug ?? post.category}`,
      },
      { name: post.title, path: `/guides/${post.slug}` },
    ]),
  ];

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <header className="border-b border-[#234331]/10 bg-[#101b15] text-white">
          <div className="mx-auto max-w-5xl px-3 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/68">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-white"
              >
                <BookOpenText size={15} aria-hidden="true" />
                Guides
              </Link>
              {category ? (
                <Link
                  href={`/guides/category/${category.slug}`}
                  className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-white"
                >
                  <Layers3 size={15} aria-hidden="true" />
                  {category.name}
                </Link>
              ) : null}
              <span className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-white">
                <Clock size={15} aria-hidden="true" />
                {post.readingMinutes} min read
              </span>
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] tracking-normal sm:text-6xl">
              {post.title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/72 sm:text-lg sm:leading-8">
              {post.description}
            </p>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-white/50">
              Updated {new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date(post.updatedAt))}
            </p>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-8 px-3 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:px-8">
          <div className="min-w-0">
            <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                Key takeaways
              </p>
              <div className="mt-4 grid gap-3">
                {post.takeaways.map((item) => (
                  <div key={item} className="flex gap-3 rounded-md bg-[#f7f3ea] p-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#2f6f8f]" aria-hidden="true" />
                    <p className="text-sm font-semibold leading-6 text-stone-700">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-7 grid gap-7">
              {post.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-3xl font-black leading-tight text-stone-950">
                    {section.heading}
                  </h2>
                  <div className="mt-4 grid gap-4 text-base leading-8 text-stone-600">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-8 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                FAQ
              </p>
              <div className="mt-4 grid gap-3">
                {post.faq.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-md border border-[#234331]/10 bg-white p-4"
                  >
                    <h3 className="text-base font-black leading-6 text-stone-950">
                      {item.question}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
            <div className="rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.14)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d99a61]">
                Huntfields
              </p>
              <h2 className="mt-3 text-2xl font-black leading-tight">
                {post.ctaTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {post.ctaBody}
              </p>
              <Link
                href={post.ctaHref}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[#183326] transition hover:bg-[#f7f3ea]"
              >
                {post.ctaLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                Related guides
              </p>
              <div className="mt-4 grid gap-3">
                {related.map((item) => {
                  const itemCategory = getGuideCategory(item.category);
                  return (
                    <Link
                      key={item.slug}
                      href={`/guides/${item.slug}`}
                      className="rounded-md border border-[#234331]/10 bg-white p-3 transition hover:border-[#234331]/35"
                    >
                      <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
                        {itemCategory?.name ?? "Guide"}
                      </span>
                      <span className="mt-1 block text-sm font-black leading-5 text-stone-950">
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
