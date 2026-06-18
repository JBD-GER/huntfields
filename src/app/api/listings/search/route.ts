import { NextResponse } from "next/server";
import {
  searchListingsByRadius,
  searchListingsByRegion,
} from "@/lib/data/listings";
import { getUsLaunchState } from "@/lib/us-market";

const pageSizeCap = 48;

function numberParam(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country")?.toUpperCase() || "US";
  const state = getUsLaunchState(url.searchParams.get("state") ?? "TX");
  const radius = url.searchParams.get("radius") ?? "statewide";
  const listingType = url.searchParams.get("type");
  const minArea = numberParam(url.searchParams.get("min_area"));
  const lat = numberParam(url.searchParams.get("lat"));
  const lng = numberParam(url.searchParams.get("lng"));
  const offset = Math.max(numberParam(url.searchParams.get("offset")) ?? 0, 0);
  const limit = Math.min(
    Math.max(numberParam(url.searchParams.get("limit")) ?? 24, 1),
    pageSizeCap,
  );
  const listingTypes = listingType ? [listingType] : undefined;

  const result =
    radius === "statewide"
      ? await searchListingsByRegion({
          countryCode: country,
          adminAreaCode: country === "US" ? state.code : null,
          listingTypes,
          minAreaAcres: minArea,
          limit,
          offset,
        })
      : await searchListingsByRadius({
          countryCode: country,
          lat: lat ?? state.lat,
          lng: lng ?? state.lng,
          radiusMeters: numberParam(radius) ?? 160934,
          listingTypes,
          minAreaAcres: minArea,
          limit,
          offset,
        });

  return NextResponse.json({
    listings: result.data,
    error: result.error,
    hasMore: result.data.length === limit,
    nextOffset: offset + result.data.length,
  });
}
