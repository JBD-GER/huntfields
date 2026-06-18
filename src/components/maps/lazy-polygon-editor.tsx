"use client";

import dynamic from "next/dynamic";

export const LazyPolygonEditor = dynamic(
  () =>
    import("@/components/maps/polygon-editor").then(
      (mod) => mod.PolygonEditor,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);
