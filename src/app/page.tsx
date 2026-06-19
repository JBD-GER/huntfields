import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  MapPinned,
  PlusCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { LeaseFilterForm } from "@/components/forms/lease-filter-form";
import { ListingGrid } from "@/components/listings/listing-grid";
import { LazyListingMap } from "@/components/maps/lazy-listing-map";
import {
  getFeaturedListingsByRegion,
  getLegalRegions,
} from "@/lib/data/listings";
import {
  breadcrumbStructuredData,
  listingItemListStructuredData,
  pageMetadata,
  regionStructuredData,
} from "@/lib/seo/site";

export const revalidate = 3600;

const heroImage =
  "/images/hunting-lease-forest-bear-hero.png";

export const metadata = pageMetadata({
  title: "Hunting Leases and Hunting Land for Lease in the USA",
  description:
    "Find hunting leases, private hunting land, and landowner-approved hunting access by US state, radius, or map search. List hunting land with private parcel protection.",
  path: "/",
  image: heroImage,
});

export default async function Home() {
  const [featured, regions] = await Promise.all([
    getFeaturedListingsByRegion({ countryCode: "US", limit: 6 }),
    getLegalRegions(),
  ]);
  const stateRegions = regions.data.filter(
    (region) => region.country_code === "US" && region.admin_area_slug,
  );
  const usRegion = regions.data.find(
    (region) => region.country_code === "US" && !region.admin_area_slug,
  );

  return (
    <>
      <section className="relative isolate min-h-[calc(100svh-3.5rem)] overflow-hidden bg-[#17251d]">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,13,0.88),rgba(10,18,13,0.58)_42%,rgba(10,18,13,0.18)_72%),linear-gradient(180deg,rgba(10,18,13,0.18),rgba(246,242,233,0.92)_96%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#f6f2e9]" />
        <div className="relative mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl flex-col justify-end px-3 pb-8 pt-20 sm:px-6 sm:pb-12 lg:px-8 lg:pt-24">
          <div className="max-w-4xl text-white">
            <p className="inline-flex items-center gap-2 rounded-md border border-white/18 bg-white/12 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] backdrop-blur">
              <ShieldCheck size={16} aria-hidden="true" />
              US-first hunting lease marketplace
            </p>
            <h1 className="mt-5 max-w-4xl text-[2.75rem] font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
              Hunting leases and hunting land for lease.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/88 sm:text-xl sm:leading-8">
              Search private hunting land by US state, radius, or map. Landowners
              can list hunting leases with exact parcel boundaries kept private
              until approval and signed access terms.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/land"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#183326] shadow-[0_22px_48px_rgba(0,0,0,0.24)] transition hover:bg-stone-100 sm:min-h-12 sm:text-base"
              >
                <Search size={18} aria-hidden="true" />
                Find hunting leases
              </Link>
              <Link
                href="/list-your-land"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/42 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/16 sm:min-h-12 sm:text-base"
              >
                <PlusCircle size={18} aria-hidden="true" />
                List your land
              </Link>
            </div>
          </div>
          <div className="mt-7 sm:mt-9">
            <LeaseFilterForm />
          </div>
        </div>
      </section>

      <section className="relative -mt-5 pb-12 sm:-mt-8 sm:pb-16">
        <div className="mx-auto grid max-w-7xl gap-3 px-3 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            [
              BadgeCheck,
              "Verified owner workflow",
              "Owner profiles, review steps, and property-proof uploads help hunters start with serious, accountable land access.",
            ],
            [
              MapPinned,
              "Find land that fits your hunt",
              "Filter by state, distance, acreage, and map area so you spend less time browsing and more time planning the right trip.",
            ],
            [
              ShieldCheck,
              "Clear rules before access",
              "See landowner rules, species, amenities, and request status before exact gates and access routes are shared.",
            ],
          ].map(([Icon, title, copy]) => {
            const IconComponent = Icon as typeof BadgeCheck;
            return (
            <div
              key={String(title)}
              className="rounded-lg border border-[#234331]/10 bg-[#fffdf7]/92 p-4 shadow-[0_18px_50px_rgba(25,35,29,0.1)] backdrop-blur sm:p-5"
            >
              <IconComponent className="size-6 text-[#c76b2f]" aria-hidden="true" />
              <h2 className="mt-4 text-base font-black text-stone-950">{String(title)}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{String(copy)}</p>
            </div>
          );})}
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="mx-auto grid max-w-7xl gap-7 px-3 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
              US state landing pages
            </p>
            <h2 className="mt-3 text-3xl font-black leading-[1.04] tracking-normal text-stone-950 sm:text-5xl">
              Find private hunting leases by state.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              Start with the state you want to hunt, then narrow the results by
              distance, acreage, terrain, and availability. Huntfields keeps the
              search simple for hunters while giving landowners a clear way to
              present serious lease opportunities.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {stateRegions.slice(0, 8).map((region) => (
                <Link
                  key={region.id}
                  href={`/land/${region.country_slug}/${region.admin_area_slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#234331]/12 bg-white/78 px-3 py-2 text-sm font-bold text-stone-800 shadow-sm transition hover:border-[#234331]/35 hover:text-[#234331]"
                >
                  <MapPin size={16} aria-hidden="true" />
                  {region.admin_area_name} hunting leases
                </Link>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#234331]/10 bg-white shadow-[0_22px_70px_rgba(25,35,29,0.12)]">
            <LazyListingMap listings={featured.data} className="min-h-[360px] border-0 sm:min-h-[500px]" />
          </div>
        </div>
      </section>

      <section className="border-y border-[#234331]/10 bg-[#1a2820] py-14 text-white sm:py-16">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d99a61]">
                Featured access
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-normal text-white sm:text-4xl">
                Featured hunting land for lease
              </h2>
            </div>
            <Link
              href="/land"
              className="inline-flex items-center gap-2 text-sm font-black text-[#e7c196]"
            >
              Search hunting leases
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-8">
            <ListingGrid listings={featured.data} error={featured.error} />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-3 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
              Landowners
            </p>
            <h2 className="mt-3 text-3xl font-black leading-[1.06] tracking-normal text-stone-950 sm:text-4xl">
              List hunting land without exposing the exact boundary publicly.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
              Draw the huntable area once, add the rules that matter, and review
              hunter requests before exact gates, routes, or property details
              are shared. You stay in control from the first message.
            </p>
          </div>
          <Link
            href="/list-your-land"
            className="flex min-h-40 items-center justify-between rounded-lg bg-[#183326] p-5 text-white shadow-[0_24px_64px_rgba(24,51,38,0.25)] transition hover:bg-[#10271d] sm:min-h-44 sm:p-6"
          >
            <span>
              <span className="block text-xl font-black">List your land</span>
              <span className="mt-2 block text-sm leading-6 text-white/80">
                Create a polished listing with map area, wildlife, rules, and a request-first approval flow.
              </span>
            </span>
            <MapPin size={28} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {usRegion && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              regionStructuredData(usRegion, "/"),
              breadcrumbStructuredData([{ name: "Home", path: "/" }]),
              listingItemListStructuredData(
                featured.data,
                "/",
                "Featured hunting land for lease",
              ),
            ]),
          }}
        />
      )}
    </>
  );
}
