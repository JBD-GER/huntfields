import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { LeaseFilterForm } from "@/components/forms/lease-filter-form";
import { ListingResults } from "@/components/listings/listing-results";
import { LazyListingMap } from "@/components/maps/lazy-listing-map";
import {
  getLegalRegions,
  searchListingsByRadius,
  searchListingsByRegion,
} from "@/lib/data/listings";
import { absoluteUrl, pageMetadata } from "@/lib/seo/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUsLaunchState } from "@/lib/us-market";

export const revalidate = 900;

export const metadata = pageMetadata({
  title: "Hunting Leases in the USA | Private Hunting Land for Lease",
  description:
    "Find private hunting leases, hunting land for lease, ranch access, wooded acreage, and landowner-approved hunting access across the United States.",
  path: "/land",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const pageSize = 24;

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function radiusLabel(radius: string) {
  if (radius === "statewide") {
    return "statewide";
  }

  const meters = Number(radius);
  return Number.isFinite(meters)
    ? `${Math.round(meters / 1609).toLocaleString()} miles`
    : "statewide";
}

export default async function LandSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const lat = cleanNumber(stringParam(params.lat));
  const lng = cleanNumber(stringParam(params.lng));
  const radius = stringParam(params.radius) ?? "statewide";
  const country = stringParam(params.country)?.toUpperCase() || "US";
  const state = getUsLaunchState(stringParam(params.state) ?? "TX");
  const listingType = stringParam(params.type);
  const minAreaValue = stringParam(params.min_area);
  const minArea = cleanNumber(minAreaValue);
  const searchLat = lat ?? state.lat;
  const searchLng = lng ?? state.lng;
  const listingTypes = listingType ? [listingType] : undefined;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const viewerCanSeeDetails = Boolean(user);

  const listings =
    radius === "statewide"
      ? await searchListingsByRegion({
          countryCode: country,
          adminAreaCode: country === "US" ? state.code : null,
          listingTypes,
          minAreaAcres: minArea,
          limit: pageSize,
        })
      : await searchListingsByRadius({
          countryCode: country,
          lat: searchLat,
          lng: searchLng,
          radiusMeters: cleanNumber(radius) ?? 160934,
          listingTypes,
          minAreaAcres: minArea,
          limit: pageSize,
        });

  const regions = await getLegalRegions();
  const stateRegions = regions.data.filter(
    (region) => region.country_code === "US" && region.admin_area_code,
  );
  const activeRegion = stateRegions.find(
    (region) => region.admin_area_code === state.code,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Hunting leases in the United States",
    description:
      "Search private hunting land for lease by state, acreage, radius, and map area.",
    url: absoluteUrl("/land"),
    about: ["hunting leases", "hunting land for lease", "private land access"],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative overflow-hidden border-b border-[#234331]/10 bg-[#101b15] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(199,107,47,0.28),transparent_26%),radial-gradient(circle_at_78%_0%,rgba(47,111,143,0.25),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-7 px-3 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/76 backdrop-blur">
              <Compass size={15} aria-hidden="true" />
              US hunting lease marketplace
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal sm:text-6xl">
              Hunting leases and private hunting land for lease.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:text-lg sm:leading-8">
              Search owner-submitted hunting land by state, radius, acreage,
              and map. Exact parcel boundaries stay private until the
              landowner approves access and terms are signed.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {[
                "State and radius filters",
                "Approximate public boundaries",
                "Approval-gated exact access",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-md border border-white/12 bg-white/9 px-3 py-3 text-sm font-bold text-white/84"
                >
                  <CheckCircle2 className="size-4 text-[#d99a61]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="self-end rounded-lg border border-white/12 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-5">
            <LockKeyhole className="size-6 text-[#d99a61]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-black leading-tight">
              Public map previews protect the landowner.
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/70">
              You can understand the area, terrain, and general location before
              requesting access. Exact gates, roads, and drawn boundaries stay
              private until the landowner approves.
            </p>
            <Link
              href="/auth/login?next=/land"
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[#183326] transition hover:bg-[#f7f3ea]"
            >
              Create a free account
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="-mt-12 mb-6 rounded-lg border border-[#234331]/10 bg-[#fffdf7]/96 p-3 shadow-[0_24px_70px_rgba(25,35,29,0.13)] backdrop-blur sm:p-4">
          <div className="mb-3 flex items-center gap-2 px-1 text-sm font-black text-stone-950">
            <SlidersHorizontal size={17} aria-hidden="true" />
            Start with state, distance, and acreage
          </div>
          <LeaseFilterForm
            defaults={{
              state: state.code,
              radius,
              minArea: minAreaValue ?? "",
            }}
          />
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            [listings.data.length.toLocaleString(), "shown now"],
            [state.label, "selected state"],
            [radiusLabel(radius), "search range"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_14px_36px_rgba(25,35,29,0.07)]"
            >
              <div className="text-2xl font-black text-stone-950">{value}</div>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">
                {label}
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-[#234331]/10 bg-[#183326] p-4 text-white shadow-[0_18px_50px_rgba(25,35,29,0.12)]">
              <ShieldCheck className="size-5 text-[#d99a61]" aria-hidden="true" />
              <p className="mt-3 text-sm font-black">
                Exact locations are protected.
              </p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Public users see approximate shapes. Exact boundaries,
                addresses, gates, and access routes unlock only after approval.
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_18px_50px_rgba(25,35,29,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                Search setup
              </p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-stone-700">
                <p>{state.label} hunting leases</p>
                <p>{radiusLabel(radius)} range</p>
                <p>{minArea ? `${minArea.toLocaleString()}+ acres` : "Any acreage"}</p>
              </div>
            </div>
          </aside>

          <section className="grid gap-6">
            <div>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                    Live inventory
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-stone-950">
                    Available hunting leases
                  </h2>
                </div>
              </div>
              <ListingResults
                initialListings={listings.data}
                initialError={listings.error}
                pageSize={pageSize}
                viewerCanSeeDetails={viewerCanSeeDetails}
                searchQuery={{
                  country,
                  state: state.code,
                  radius,
                  type: listingType,
                  min_area: minAreaValue,
                  lat: lat ? String(lat) : undefined,
                  lng: lng ? String(lng) : undefined,
                }}
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-[#234331]/10 bg-[#fffdf7] shadow-[0_20px_60px_rgba(25,35,29,0.1)]">
              <div className="flex flex-col gap-1 border-b border-[#234331]/10 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                    Map view
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-950">
                    General lease areas in {state.label}
                  </h2>
                </div>
                <p className="text-xs font-semibold text-stone-500">
                  Filter by state first, then tighten by radius.
                </p>
              </div>
              <LazyListingMap
                listings={listings.data}
                viewerCanSeeDetails={viewerCanSeeDetails}
                className="min-h-[320px] border-0 sm:min-h-[430px]"
              />
            </div>
          </section>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
              Hunt smarter
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">
              Find hunting leases by state, acreage, and land type.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
              Start broad by state, then narrow by acreage, distance, terrain,
              species, and owner rules. Huntfields is built so hunters can find
              relevant private land quickly while landowners keep sensitive
              property details private until they approve the request.
            </p>
            {activeRegion ? (
              <p className="mt-4 rounded-md border border-[#234331]/10 bg-[#f7f3ea] p-4 text-sm leading-6 text-stone-700">
                {activeRegion.seo_description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.14)] sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d99a61]">
                  Popular states
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Browse hunting leases
                </h3>
              </div>
              <MapPinned className="size-7 text-white/54" aria-hidden="true" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {stateRegions.map((region) => (
                <Link
                  key={region.id}
                  href={`/land?country=US&state=${region.admin_area_code}&radius=statewide`}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/12 bg-white/9 px-4 py-3 text-sm font-black text-white transition hover:bg-white/16"
                >
                  {region.admin_area_name} hunting leases
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            [
              "Season leases",
              "A season lease is usually the best fit when you want repeat access, time to pattern wildlife, and a clear relationship with the landowner.",
            ],
            [
              "Short hunts",
              "Week or day access can work well for travel hunts, scouting trips, or trying a property before committing to a longer lease.",
            ],
            [
              "Private rules",
              "Every property can have its own access windows, guest limits, vehicle rules, firearm rules, stand locations, and harvest expectations.",
            ],
            [
              "Owner approval",
              "Huntfields is built around approval-first access, so landowners can review the person behind the request before sharing sensitive details.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_14px_36px_rgba(25,35,29,0.06)]"
            >
              <h3 className="text-base font-black text-stone-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                How to compare leases
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">
                A good hunting lease is more than a pin on a map.
              </h2>
            </div>
            <div className="grid gap-4 text-sm leading-7 text-stone-600 sm:grid-cols-2">
              <p>
                Hunters need to understand habitat, acreage, access windows,
                species, pressure, safety rules, and the landowner&apos;s
                expectations. A beautiful property can still be a bad fit if
                the rules, dates, or terrain do not match the hunt.
              </p>
              <p>
                Landowners need a way to show enough information to attract the
                right hunters without exposing exact gates, routes, stands, or
                property boundaries too early. That is why Huntfields separates
                public discovery from approval-gated access.
              </p>
              <p>
                Start broad with a state search, then tighten by radius and
                acreage. Use the map to understand the general region, but treat
                the request message as the moment to explain your party size,
                timing, species interest, and experience level.
              </p>
              <p>
                The best results come from clear expectations on both sides:
                respectful communication, proof where needed, written access
                terms, and a landowner who stays in control of when the exact
                location is released.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "How do hunters request access?",
              "They create a free account, send a short message, and wait for the landowner to approve before exact access is shared.",
            ],
            [
              "Why are maps approximate?",
              "Public maps show a safe preview shape so hunters understand the area while landowners keep gates and boundaries private.",
            ],
            [
              "Can I search without a keyword box?",
              "Yes. Hunting land search is location-first, so the filters focus on state, distance, acreage, access type, and map area instead of vague keywords.",
            ],
            [
              "Is creating an account free?",
              "Yes. Creating an account is free for hunters and landowners. Payments can be added later only when a booking flow needs them.",
            ],
            [
              "Do landowners see my message first?",
              "Yes. Requests start as a short message so the owner can understand who you are, what you want to hunt, and when you want access.",
            ],
            [
              "Can owners list land without a street address?",
              "Yes. Many hunting properties do not have a useful house number. Owners can draw the huntable area and share exact access only after approval.",
            ],
            [
              "What should hunters include in a request?",
              "Mention your preferred dates, species, party size, hunting method, experience level, and any insurance or license details the owner may need.",
            ],
            [
              "Why does the map not show the exact property?",
              "Exact property information is sensitive. The public map is intentionally approximate until the landowner decides the request should move forward.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_14px_36px_rgba(25,35,29,0.06)]"
            >
              <h3 className="text-base font-black text-stone-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
