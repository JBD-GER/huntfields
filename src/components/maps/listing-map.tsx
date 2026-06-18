"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { getMapStyle, fallbackRasterStyle } from "@/lib/maps/style";
import { formatAreaForViewer } from "@/lib/listing-display";
import type {
  ListingCard,
  PublicBoundaryGeojson,
} from "@/lib/data/listings";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

type MapListing = Pick<
  ListingCard,
  | "id"
  | "slug"
  | "title"
  | "public_lat"
  | "public_lng"
  | "public_boundary_geojson"
  | "area_acres"
  | "area_hectares"
  | "area_display_source"
>;

const AREA_SOURCE_ID = "approximate-public-areas";
const AREA_FILL_LAYER_ID = "approximate-public-areas-fill";
const AREA_LINE_LAYER_ID = "approximate-public-areas-line";
const METERS_PER_ACRE = 4046.8564224;
const EARTH_RADIUS_METERS = 6371008.8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function approximateRadiusMeters(areaAcres: number) {
  const numericArea = Number(areaAcres);

  if (!Number.isFinite(numericArea) || numericArea <= 0) {
    return 4000;
  }

  const trueAreaRadius = Math.sqrt((numericArea * METERS_PER_ACRE) / Math.PI);

  return clamp(trueAreaRadius * 1.15, 1800, 42000);
}

function destinationPoint(
  lng: number,
  lat: number,
  distanceMeters: number,
  bearingDegrees: number,
): [number, number] {
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [
    (((lng2 * 180) / Math.PI + 540) % 360) - 180,
    (lat2 * 180) / Math.PI,
  ];
}

function isPublicBoundary(value: unknown): value is PublicBoundaryGeojson {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  return value.type === "Polygon" || value.type === "MultiPolygon";
}

function circleFallbackFeature(listing: MapListing): Feature<Polygon> {
  const radiusMeters = approximateRadiusMeters(listing.area_acres);
  const ring = Array.from({ length: 72 }, (_, index) =>
    destinationPoint(
      listing.public_lng,
      listing.public_lat,
      radiusMeters,
      index * 5,
    ),
  );

  const firstPoint = ring[0];

  if (firstPoint) {
    ring.push(firstPoint);
  }

  return {
    type: "Feature",
    properties: {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      area_acres: listing.area_acres,
      source: "fallback-circle",
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

function buildPublicAreas(
  listings: MapListing[],
  viewerCanSeeDetails: boolean,
): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: "FeatureCollection",
    features: listings.map((listing) => {
      if (
        viewerCanSeeDetails &&
        isPublicBoundary(listing.public_boundary_geojson)
      ) {
        return {
          type: "Feature",
          properties: {
            id: listing.id,
            slug: listing.slug,
            title: listing.title,
            area_acres: listing.area_acres,
            source: "public-boundary-preview",
          },
          geometry: listing.public_boundary_geojson,
        } satisfies Feature<Polygon | MultiPolygon>;
      }

      return circleFallbackFeature(listing);
    }),
  };
}

function renderApproximateAreas(
  map: maplibregl.Map,
  data: FeatureCollection<Polygon | MultiPolygon>,
) {
  if (!map.isStyleLoaded()) {
    return;
  }

  const source = map.getSource(AREA_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;

  if (source) {
    source.setData(data);
    return;
  }

  map.addSource(AREA_SOURCE_ID, {
    type: "geojson",
    data,
  });

  map.addLayer({
    id: AREA_FILL_LAYER_ID,
    type: "fill",
    source: AREA_SOURCE_ID,
    paint: {
      "fill-color": "#9fb35b",
      "fill-opacity": 0.26,
    },
  });

  map.addLayer({
    id: AREA_LINE_LAYER_ID,
    type: "line",
    source: AREA_SOURCE_ID,
    paint: {
      "line-color": "#183326",
      "line-opacity": 0.88,
      "line-width": 2.4,
    },
  });
}

function extendBoundsWithGeometry(
  bounds: maplibregl.LngLatBounds,
  geometry: Polygon | MultiPolygon,
) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => {
      ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    });
    return;
  }

  geometry.coordinates.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    });
  });
}

export function ListingMap({
  listings,
  className = "",
  viewerCanSeeDetails = false,
}: {
  listings: MapListing[];
  className?: string;
  viewerCanSeeDetails?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(),
      center: [-98.5795, 39.8283],
      zoom: 3,
      attributionControl: { compact: true },
    });

    mapRef.current.on("error", (event) => {
      const map = mapRef.current;

      if (!map || map.getStyle()?.sources?.["osm-raster"]) {
        return;
      }

      console.warn("Map style failed to load, switching to fallback.", event);
      map.setStyle(fallbackRasterStyle);
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    const publicAreas = buildPublicAreas(listings, viewerCanSeeDetails);

    const syncApproximateAreas = () =>
      renderApproximateAreas(map, publicAreas);

    if (map.isStyleLoaded()) {
      syncApproximateAreas();
    } else {
      map.once("load", syncApproximateAreas);
    }

    map.on("styledata", syncApproximateAreas);

    listings.forEach((listing) => {
      const marker = new maplibregl.Marker({ color: "#234331" })
        .setLngLat([listing.public_lng, listing.public_lat])
        .setPopup(
          new maplibregl.Popup({ offset: 18 }).setHTML(
            `<strong>${listing.title}</strong><br>${formatAreaForViewer(
              listing,
              viewerCanSeeDetails,
            )}<br><a href="/listings/${listing.slug}">Open listing</a>`,
          ),
        )
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([listing.public_lng, listing.public_lat]);
    });

    publicAreas.features.forEach((feature) =>
      extendBoundsWithGeometry(bounds, feature.geometry),
    );

    if (listings.length > 0) {
      map.fitBounds(bounds, {
        padding: 54,
        maxZoom: 8,
        duration: 500,
      });
    }

    return () => {
      map.off("load", syncApproximateAreas);
      map.off("styledata", syncApproximateAreas);
    };
  }, [listings, viewerCanSeeDetails]);

  return (
    <div
      ref={containerRef}
      className={`min-h-[360px] overflow-hidden rounded-lg border border-[#234331]/10 bg-stone-200 ${className}`}
      aria-label="Approximate public hunting land areas map"
    />
  );
}
