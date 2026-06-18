import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import { RequestAccessForm } from "@/components/forms/request-access-form";
import { StateRulePanel } from "@/components/compliance/state-rule-panel";
import { LazyListingMap } from "@/components/maps/lazy-listing-map";
import { SpeciesIcon } from "@/components/species/species-icon";
import {
  getListingDetailBySlug,
  listingImageUrl,
} from "@/lib/data/listings";
import {
  formatAreaForViewer,
  formatPriceForViewer,
} from "@/lib/listing-display";
import { listingStructuredData, pageMetadata } from "@/lib/seo/site";
import { getUsStateRule } from "@/lib/compliance/us-state-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 900;

type Params = Promise<{ slug: string }>;

const fallbackImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80";

function ListingDetailListCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  const isWildlife = title === "Wildlife";
  const isRules = title === "Rules";
  const maxItems = isRules ? 6 : 8;
  const listItems = items
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxItems);
  const hiddenCount = Math.max(items.length - listItems.length, 0);
  const gridClass = listItems.length > 1 ? "sm:grid-cols-2" : "";

  return (
    <div className="grid gap-4 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_14px_40px_rgba(25,35,29,0.07)] sm:p-5 lg:grid-cols-[190px_1fr] lg:items-start">
      <div className="flex items-center justify-between gap-3 lg:block">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c76b2f]">
            Property details
          </p>
          <h3 className="mt-1 text-2xl font-black text-stone-950">{title}</h3>
        </div>
        <span className="rounded-md bg-[#eef3ec] px-2.5 py-1.5 text-xs font-black text-[#234331] lg:mt-4 lg:inline-flex">
          {listItems.length || 0}
        </span>
      </div>

      {listItems.length === 0 ? (
        <p className="rounded-md bg-[#f6f2e9] px-3 py-2 text-sm font-semibold text-stone-600">
          Provided after request
        </p>
      ) : isRules ? (
        <ol className={`grid gap-2.5 text-sm text-stone-700 ${gridClass}`}>
          {listItems.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="grid min-h-[4.25rem] min-w-0 grid-cols-[2rem_1fr] gap-3 rounded-md border border-[#234331]/8 bg-[#f8f4eb] px-3 py-3"
            >
              <span className="grid size-8 place-items-center rounded-md bg-[#183326] text-sm font-black text-white">
                {index + 1}
              </span>
              <span className="line-clamp-2 min-w-0 self-center text-base leading-6 [overflow-wrap:anywhere]">
                {item}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className={`grid gap-2.5 text-sm text-stone-700 ${gridClass}`}>
          {listItems.map((item) => (
            <li
              key={item}
              className="flex min-h-[4.25rem] min-w-0 items-center gap-3 rounded-md border border-[#234331]/8 bg-[#f8f4eb] px-3 py-3"
            >
              {isWildlife ? (
                <SpeciesIcon
                  name={item}
                  className="size-5 shrink-0 text-[#234331]"
                />
              ) : (
                <span className="shrink-0 text-lg font-black text-[#c76b2f]">
                  -
                </span>
              )}
              <span className="line-clamp-2 min-w-0 text-base leading-6 [overflow-wrap:anywhere]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="text-xs font-bold text-stone-500 lg:col-start-2">
          +{hiddenCount} more after request
        </p>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const listing = await getListingDetailBySlug(slug);

  if (!listing.data) {
    return pageMetadata({
      title: "Listing not found",
      description: "This hunting land listing is not available.",
      path: `/listings/${slug}`,
    });
  }

  return pageMetadata({
    title: listing.data.title,
    description: listing.data.summary,
    path: `/listings/${slug}`,
    image:
      listingImageUrl(listing.data.cover_image_path, listing.data.slug) ??
      fallbackImage,
  });
}

export default async function ListingDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const listing = await getListingDetailBySlug(slug);

  if (!listing.data && !listing.error) {
    notFound();
  }

  if (!listing.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">
          Listing unavailable
        </h1>
        <p className="mt-3 text-stone-600">{listing.error}</p>
      </div>
    );
  }

  const image =
    listingImageUrl(listing.data.cover_image_path, listing.data.slug) ??
    fallbackImage;
  const stateRule = await getUsStateRule(listing.data.admin_area_code);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const viewerCanSeeDetails = Boolean(user);

  return (
    <div>
      <section className="relative min-h-[520px] overflow-hidden bg-[#17251d] sm:min-h-[68svh]">
        <Image
          src={image}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,13,0.88),rgba(10,18,13,0.52)_48%,rgba(10,18,13,0.12)_82%),linear-gradient(180deg,rgba(10,18,13,0.18),rgba(246,242,233,0.9)_98%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#f6f2e9]" />
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-end px-3 pb-8 pt-24 text-white sm:min-h-[68svh] sm:px-6 sm:pb-11 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-md border border-white/18 bg-white/12 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] backdrop-blur">
              {listing.data.listing_type_label}
            </p>
            <p className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-black/18 px-3 py-2 text-xs font-bold text-white/78 backdrop-blur">
              <MapPin size={14} aria-hidden="true" />
              {[listing.data.nearest_town, listing.data.admin_area_name]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <h1 className="max-w-4xl text-[2.45rem] font-black leading-[0.98] tracking-normal sm:text-6xl">
            {listing.data.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/88 sm:text-lg sm:leading-8">
            {listing.data.summary}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-7 sm:px-6 sm:py-10 lg:grid-cols-[1fr_380px] lg:gap-8 lg:px-8">
        <article className="grid gap-7 sm:gap-8">
          <div className="-mt-12 grid gap-2 sm:-mt-16 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [MapPin, [listing.data.nearest_town, listing.data.admin_area_name, listing.data.country_name].filter(Boolean).join(", ")],
              [Ruler, formatAreaForViewer(listing.data, viewerCanSeeDetails)],
              [CalendarDays, formatPriceForViewer(listing.data, viewerCanSeeDetails)],
              [
                LockKeyhole,
                viewerCanSeeDetails
                  ? "Drawn preview visible"
                  : "Detailed preview after signup",
              ],
            ].map(([Icon, text]) => {
              const IconComponent = Icon as typeof MapPin;
              return (
                <div
                  key={String(text)}
                  className="rounded-lg border border-[#234331]/10 bg-[#fffdf7]/95 p-4 text-sm font-bold text-stone-800 shadow-[0_18px_50px_rgba(25,35,29,0.12)] backdrop-blur"
                >
                  <IconComponent className="mb-3 size-5 text-[#c76b2f]" aria-hidden="true" />
                  {String(text)}
                </div>
              );
            })}
          </div>

          <section className="overflow-hidden rounded-lg border border-[#234331]/10 bg-[#fffdf7] shadow-[0_20px_60px_rgba(25,35,29,0.1)]">
            <div className="flex flex-col gap-2 border-b border-[#234331]/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-2 text-sm font-black text-stone-900">
                <ShieldCheck size={17} aria-hidden="true" className="text-[#2f6f8f]" />
                Approximate public land area
              </div>
              <p className="max-w-xl text-xs font-semibold leading-5 text-stone-500">
                Exact gates, routes, and parcel coordinates unlock only after approval.
              </p>
            </div>
            <LazyListingMap
              listings={[listing.data]}
              viewerCanSeeDetails={viewerCanSeeDetails}
              className="min-h-[360px] border-0 sm:min-h-[460px]"
            />
          </section>

          <section className="grid gap-4">
            <ListingDetailListCard
              title="Wildlife"
              items={listing.data.wildlife}
            />
            <ListingDetailListCard
              title="Amenities"
              items={listing.data.amenities}
            />
            <ListingDetailListCard title="Rules" items={listing.data.rules} />
          </section>

          <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-6">
            <h2 className="text-2xl font-black tracking-normal text-stone-950">
              Land access details
            </h2>
            <p className="mt-4 text-base leading-8 text-stone-700">
              {listing.data.description ?? listing.data.summary}
            </p>
          </section>

          {stateRule && <StateRulePanel rule={stateRule} />}
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_24px_70px_rgba(25,35,29,0.13)] sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#183326] text-white">
                <MessageCircle size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-black tracking-normal text-stone-950">
                  {user ? "Message the landowner" : "Contact the landowner"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Start with a short access request. Exact coordinates and
                  polygon boundaries remain private until approval or booking.
                </p>
              </div>
            </div>
            <div className="my-5 h-px bg-[#234331]/10" />
            <p className="mb-5 rounded-md border border-[#d9c6aa] bg-[#fff8ec] px-3 py-2 text-xs font-bold leading-5 text-[#7a4a24]">
              No payment is collected before landowner approval and signed terms.
            </p>
            <div>
              <RequestAccessForm
                listingId={listing.data.id}
                isAuthenticated={Boolean(user)}
                nextPath={`/listings/${listing.data.slug}`}
              />
            </div>
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(listingStructuredData(listing.data)),
        }}
      />
    </div>
  );
}
