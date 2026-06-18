import { env } from "@/lib/env";
import type { StyleSpecification } from "maplibre-gl";

export const fallbackRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm-raster",
    },
  ],
};

export function getMapStyle() {
  const styleUrl = env.mapStyleUrl?.trim();

  if (
    styleUrl &&
    (styleUrl.startsWith("https://") ||
      styleUrl.startsWith("http://") ||
      styleUrl.startsWith("/"))
  ) {
    return styleUrl;
  }

  return fallbackRasterStyle;
}
