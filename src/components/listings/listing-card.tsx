import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Ruler, Trees } from "lucide-react";
import type { ListingCard as ListingCardType } from "@/lib/data/listings";
import {
  formatAreaForViewer,
  formatPriceForViewer,
  listingImageUrl,
} from "@/lib/listing-display";

const fallbackImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=75";

export function ListingCard({
  listing,
  viewerCanSeeDetails = false,
}: {
  listing: ListingCardType;
  viewerCanSeeDetails?: boolean;
}) {
  const image =
    listingImageUrl(listing.cover_image_path, listing.slug) ?? fallbackImage;

  return (
    <article className="group overflow-hidden rounded-lg border border-[#234331]/10 bg-[#fffdf7] shadow-[0_18px_48px_rgba(25,35,29,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#234331]/24 hover:shadow-[0_26px_70px_rgba(25,35,29,0.14)]">
      <Link href={`/listings/${listing.slug}`} className="block">
        <div className="relative aspect-[1.22] overflow-hidden bg-stone-200">
          <Image
            src={image}
            alt=""
            fill
            loading="lazy"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/62" />
          <div className="absolute left-3 top-3 rounded-md border border-white/30 bg-white/88 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#183326] shadow-sm backdrop-blur">
            {listing.listing_type_label}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
            <div className="text-sm font-black drop-shadow">
              {formatPriceForViewer(listing, viewerCanSeeDetails)}
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-white/24 bg-white/16 backdrop-blur transition group-hover:bg-white/26">
              <ArrowUpRight size={17} aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <h3 className="line-clamp-2 text-base font-black leading-6 tracking-normal text-stone-950">
              {listing.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
              {listing.summary}
            </p>
          </div>
          <div className="grid gap-2 border-t border-[#234331]/10 pt-3 text-sm font-semibold text-stone-700">
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-[#c76b2f]" aria-hidden="true" />
              <span className="truncate">
              {[listing.nearest_town, listing.admin_area_name, listing.country_name]
                .filter(Boolean)
                .join(", ")}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Ruler className="size-4 shrink-0 text-[#2f6f8f]" aria-hidden="true" />
              {formatAreaForViewer(listing, viewerCanSeeDetails)}
            </span>
            <span className="flex items-center gap-2">
              <Trees className="size-4 shrink-0 text-[#234331]" aria-hidden="true" />
              {viewerCanSeeDetails
                ? "Approximate drawn preview"
                : "General area preview"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
