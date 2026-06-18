import { notFound } from "next/navigation";
import { Scale } from "lucide-react";
import { ListingGrid } from "@/components/listings/listing-grid";
import { LazyListingMap } from "@/components/maps/lazy-listing-map";
import {
  getFeaturedListingsByRegion,
  getLegalRegions,
  getRegionBySlugs,
} from "@/lib/data/listings";
import { regionMetadata, regionStructuredData } from "@/lib/seo/site";

export const revalidate = 3600;

type Params = Promise<{ country: string; state: string }>;

export async function generateStaticParams() {
  const regions = await getLegalRegions();

  return regions.data
    .filter((region) => region.admin_area_slug)
    .map((region) => ({
      country: region.country_slug,
      state: region.admin_area_slug!,
    }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { country, state } = await params;
  const region = await getRegionBySlugs(country, state);

  if (!region.data) {
    return {};
  }

  return regionMetadata(region.data, `/land/${country}/${state}`);
}

export default async function StateLandingPage({ params }: { params: Params }) {
  const { country, state } = await params;
  const region = await getRegionBySlugs(country, state);

  if (!region.data && !region.error) {
    notFound();
  }

  const listings = region.data
    ? await getFeaturedListingsByRegion({
        countryCode: region.data.country_code,
        adminAreaCode: region.data.admin_area_code,
        regionSlug: `${country}/${state}`,
        limit: 24,
      })
    : { data: [], error: region.error };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c76b2f]">
            Regional hunting access
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-normal text-stone-950 sm:text-5xl">
            {region.data?.seo_title ??
              `${region.data?.admin_area_name ?? "Regional"} hunting land`}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
            {region.data?.seo_description ??
              "Search landowner-approved opportunities with approximate public locations and approval-gated parcel data."}
          </p>
          {region.data && (
            <div className="mt-6 rounded-md border border-stone-200 bg-white p-4">
              <div className="flex gap-3">
                <Scale className="mt-1 size-5 text-[#2f6f8f]" aria-hidden="true" />
                <div className="text-sm leading-6 text-stone-700">
                  <p className="font-bold text-stone-950">
                    Access rules and notices
                  </p>
                  <p>{region.data.firearm_notice}</p>
                  <p className="mt-2">{region.data.access_terms}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <LazyListingMap listings={listings.data} className="min-h-[430px]" />
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-black tracking-normal text-stone-950">
          Featured listings
        </h2>
        <div className="mt-5">
          <ListingGrid listings={listings.data} error={listings.error} />
        </div>
      </section>

      {region.data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              regionStructuredData(region.data, `/land/${country}/${state}`),
            ),
          }}
        />
      )}
    </div>
  );
}
