"use client";

import dynamic from "next/dynamic";

export const LazyListingMap = dynamic(
  () => import("@/components/maps/listing-map").then((mod) => mod.ListingMap),
  {
    ssr: false,
    loading: () => null,
  },
);
