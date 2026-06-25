import type { Metadata } from "next";
import { env } from "@/lib/env";
import type { ListingCard, ListingDetail, LegalRegion } from "@/lib/data/listings";
import {
  formatAreaForViewer,
  formatPriceForViewer,
  listingImageUrl,
} from "@/lib/listing-display";

export const site = {
  name: "Huntfields",
  description:
    "A privacy-first international marketplace for vetted hunting land access, leases, and landowner-approved bookings.",
  url: env.appUrl,
  defaultImage: "/opengraph-image",
  keywords: [
    "hunting leases",
    "hunting land for lease",
    "private hunting land",
    "hunting lease marketplace",
    "deer lease",
    "ranch hunting lease",
    "landowner hunting access",
    "US hunting leases",
  ],
};

export function absoluteUrl(path: string) {
  return new URL(path, env.appUrl).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  imageWidth = 1200,
  imageHeight = 630,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = image ? absoluteUrl(image) : absoluteUrl(site.defaultImage);
  const resolvedImageAlt = imageAlt ?? `${site.name} hunting lease marketplace`;

  return {
    title,
    description,
    keywords: site.keywords,
    alternates: {
      canonical: url,
    },
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: site.name,
      type: "website",
      locale: "en_US",
      images: [
        {
          url: imageUrl,
          width: imageWidth,
          height: imageHeight,
          alt: resolvedImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
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
  const imageUrl = listingImageUrl(listing.cover_image_path, listing.slug);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.summary,
    image: imageUrl ? absoluteUrl(imageUrl) : absoluteUrl(site.defaultImage),
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
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/listings/${listing.slug}`),
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Public area guide",
        value: formatAreaForViewer(listing, false),
      },
      {
        "@type": "PropertyValue",
        name: "Public price guide",
        value: formatPriceForViewer(listing, false),
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

export function websiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: absoluteUrl("/"),
    description: site.description,
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/land")}?state={search_term_string}&radius=statewide`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo_black.png"),
    description: site.description,
    sameAs: [],
  };
}

export function breadcrumbStructuredData(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function listingItemListStructuredData(
  listings: ListingCard[],
  path: string,
  name: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(path),
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 24).map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/listings/${listing.slug}`),
      name: listing.title,
    })),
  };
}
