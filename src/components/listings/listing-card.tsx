import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, MapPinned, Ruler, Trees } from "lucide-react";
import type { ListingCard as ListingCardType } from "@/lib/data/listings";
import {
  formatAreaForViewer,
  formatPriceForViewer,
  listingImageUrl,
} from "@/lib/listing-display";

const fallbackImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=75";

function cardLocation(listing: ListingCardType) {
  return (
    [listing.nearest_town, listing.admin_area_name, listing.country_name]
      .filter(Boolean)
      .join(", ") || "Private location after approval"
  );
}

function propertyVerificationLabel(status?: ListingCardType["property_verification_status"]) {
  return status === "verified" ? "Verified" : "Pending";
}

export function ListingCard({
  listing,
  viewerCanSeeDetails = false,
}: {
  listing: ListingCardType;
  viewerCanSeeDetails?: boolean;
}) {
  const image =
    listingImageUrl(listing.cover_image_path, listing.slug) ?? fallbackImage;
  const propertyVerified = listing.property_verification_status === "verified";
  const checkpoints = [
    {
      icon: MapPin,
      label: cardLocation(listing),
      className: "text-[#c76b2f]",
    },
    {
      icon: Ruler,
      label: formatAreaForViewer(listing, viewerCanSeeDetails),
      className: "text-[#2f6f8f]",
    },
    {
      icon: Trees,
      label: viewerCanSeeDetails
        ? "Approximate drawn preview"
        : "General area preview",
      className: "text-[#234331]",
    },
  ];

  return (
    <article className="group h-full overflow-hidden rounded-lg border border-[#234331]/10 bg-[#fffdf7] shadow-[0_18px_48px_rgba(25,35,29,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#234331]/24 hover:shadow-[0_26px_70px_rgba(25,35,29,0.14)]">
      <Link href={`/listings/${listing.slug}`} className="flex h-full flex-col">
        <div className="relative h-[14.5rem] shrink-0 overflow-hidden bg-stone-200 sm:h-[17rem] lg:h-[18rem]">
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
          <div
            className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] shadow-sm backdrop-blur ${
              propertyVerified
                ? "border-[#234331]/24 bg-[#eef3ec]/92 text-[#183326]"
                : "border-white/30 bg-white/64 text-stone-600"
            }`}
          >
            <MapPinned
              size={13}
              aria-hidden="true"
              className={
                propertyVerified
                  ? "text-[#234331]"
                  : "text-stone-400 opacity-60"
              }
            />
            {propertyVerificationLabel(listing.property_verification_status)}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
            <div className="max-w-[calc(100%-3.25rem)] truncate text-sm font-black drop-shadow sm:text-base">
              {formatPriceForViewer(listing, viewerCanSeeDetails)}
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-white/24 bg-white/16 backdrop-blur transition group-hover:bg-white/26">
              <ArrowUpRight size={17} aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="shrink-0">
            <h3 className="line-clamp-2 text-base font-black leading-6 tracking-normal text-stone-950 sm:text-lg">
              {listing.title}
            </h3>
            <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-stone-600">
              {listing.summary}
            </p>
          </div>
          <div className="mt-4 grid gap-2 border-t border-[#234331]/10 pt-3 text-sm font-semibold text-stone-700">
            {checkpoints.map(({ icon: Icon, label, className }) => (
              <span
                key={label}
                className="flex h-7 min-w-0 items-center gap-2"
              >
                <Icon
                  className={`size-4 shrink-0 ${className}`}
                  aria-hidden="true"
                />
                <span className="truncate">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
