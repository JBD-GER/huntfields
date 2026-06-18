import type { Metadata } from "next";
import { env } from "@/lib/env";
import type { ListingDetail, LegalRegion } from "@/lib/data/listings";
import { formatPrice } from "@/lib/data/listings";
import { formatAreaDisplay } from "@/lib/area-format";

export const site = {
  name: "Huntfields",
  description:
    "A privacy-first international marketplace for vetted hunting land access, leases, and landowner-approved bookings.",
};

export function absoluteUrl(path: string) {
  return new URL(path, env.appUrl).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: site.name,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function regionMetadata(region: LegalRegion, path: string): Metadata {
  const title =
    region.seo_title ??
    `${region.admin_area_name ?? region.country_name} hunting leases and land access`;
  const description =
    region.seo_description ??
    `Find private hunting land access, lease opportunities, and landowner-approved requests in ${region.admin_area_name ?? region.country_name}.`;

  return pageMetadata({ title, description, path });
}

export function listingStructuredData(listing: ListingDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.summary,
    category: listing.listing_type_label,
    areaServed: {
      "@type": "Place",
      name: [listing.nearest_town, listing.admin_area_name, listing.country_name]
        .filter(Boolean)
        .join(", "),
      geo: {
        "@type": "GeoCoordinates",
        latitude: listing.public_lat,
        longitude: listing.public_lng,
      },
    },
    offers: {
      "@type": "Offer",
      priceCurrency: listing.currency,
      price:
        listing.price_cents === null
          ? undefined
          : (listing.price_cents / 100).toFixed(0),
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/listings/${listing.slug}`),
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Area",
        value: formatAreaDisplay(listing),
      },
      {
        "@type": "PropertyValue",
        name: "Price",
        value: formatPrice(listing),
      },
    ],
  };
}

export function regionStructuredData(region: LegalRegion, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name:
      region.seo_title ??
      `${region.admin_area_name ?? region.country_name} hunting land access`,
    description: region.seo_description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: site.name,
      url: absoluteUrl("/"),
    },
  };
}
