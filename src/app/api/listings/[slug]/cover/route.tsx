import { ImageResponse } from "next/og";
import {
  formatPrice,
  getListingDetailBySlug,
  type ListingDetail,
  type PublicBoundaryGeojson,
} from "@/lib/data/listings";
import { formatAreaDisplay } from "@/lib/area-format";

export const revalidate = 3600;

type Theme = {
  background: string;
  land: string;
  forest: string;
  forestDark: string;
  contour: string;
  road: string;
  water: string;
  accent: string;
  text: string;
  subtext: string;
  badge: string;
  label: string;
};

const themes: Record<string, Theme> = {
  GA: {
    background: "#dfe9d7",
    land: "#c8d8b7",
    forest: "#6e8f58",
    forestDark: "#365b38",
    contour: "#91a777",
    road: "#d8b26f",
    water: "#6aa0a8",
    accent: "#f3c96b",
    text: "#f8f6ec",
    subtext: "#e7e0cf",
    badge: "#203f2f",
    label: "Southeast pine and hardwood cover",
  },
  TX: {
    background: "#e7dcc6",
    land: "#d5c398",
    forest: "#8b8c56",
    forestDark: "#454b31",
    contour: "#b49b68",
    road: "#c7783d",
    water: "#6f9ca0",
    accent: "#f0b45d",
    text: "#fff8eb",
    subtext: "#eadcc5",
    badge: "#2f3c25",
    label: "Panhandle ranch terrain",
  },
  MT: {
    background: "#d8e4dd",
    land: "#bdcdb5",
    forest: "#607d58",
    forestDark: "#243f35",
    contour: "#829977",
    road: "#b88b55",
    water: "#4d8da1",
    accent: "#d9ecb7",
    text: "#f8fbf5",
    subtext: "#dfe9df",
    badge: "#1c342e",
    label: "Mountain timber and meadow edge",
  },
  CO: {
    background: "#d8e1dc",
    land: "#c3ceb8",
    forest: "#667f59",
    forestDark: "#263d36",
    contour: "#879678",
    road: "#b98950",
    water: "#4f8c9c",
    accent: "#d6e3a5",
    text: "#f8fbf5",
    subtext: "#e1eadf",
    badge: "#203a33",
    label: "High-country timber access",
  },
};

const defaultTheme: Theme = {
  background: "#e2e6dc",
  land: "#cbd8bf",
  forest: "#718f60",
  forestDark: "#274333",
  contour: "#90a17d",
  road: "#bc8953",
  water: "#5d96a0",
  accent: "#e9c66a",
  text: "#faf8ee",
  subtext: "#e6dfcf",
  badge: "#213d31",
  label: "Private hunting land access",
};

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function themeFor(listing: ListingDetail | null) {
  return themes[listing?.admin_area_code ?? ""] ?? defaultTheme;
}

function polygonPath(boundary: PublicBoundaryGeojson | null | undefined) {
  if (!boundary) {
    return "M 338 360 L 442 302 L 574 335 L 642 452 L 562 575 L 400 552 L 304 470 Z";
  }

  const rings =
    boundary.type === "Polygon"
      ? boundary.coordinates
      : boundary.coordinates.flatMap((polygon) => polygon);
  const points = rings.flat();

  if (points.length === 0) {
    return "M 338 360 L 442 302 L 574 335 L 642 452 L 562 575 L 400 552 L 304 470 Z";
  }

  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const rangeLng = Math.max(maxLng - minLng, 0.001);
  const rangeLat = Math.max(maxLat - minLat, 0.001);
  const size = Math.max(rangeLng, rangeLat);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const paddedMinLng = centerLng - size / 2;
  const paddedMinLat = centerLat - size / 2;
  const width = 560;
  const height = 420;
  const left = 300;
  const top = 235;

  return rings
    .map((ring) =>
      ring
        .map(([lng, lat], index) => {
          const x = left + ((lng - paddedMinLng) / size) * width;
          const y = top + height - ((lat - paddedMinLat) / size) * height;
          return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ")
        .concat(" Z"),
    )
    .join(" ");
}

function fallbackListing(slug: string): ListingDetail {
  return {
    id: slug,
    slug,
    title: titleFromSlug(slug),
    summary: "Private hunting land access with owner-approved boundaries.",
    description: null,
    listing_type_slug: "hunting-lease",
    listing_type_label: "Hunting lease",
    country_code: "US",
    country_name: "United States",
    admin_area_code: null,
    admin_area_name: "United States",
    region_name: "United States",
    region_slug: "united-states",
    nearest_town: null,
    public_lat: 39.8283,
    public_lng: -98.5795,
    public_boundary_geojson: null,
    area_acres: 0,
    area_hectares: 0,
    area_display_source: "drawn_boundary",
    price_cents: null,
    currency: "USD",
    price_unit: "per_request",
    cover_image_path: null,
    featured_score: 0,
    published_at: null,
    distance_meters: null,
    wildlife: [],
    amenities: [],
    rules: [],
    owner_name: null,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const result = await getListingDetailBySlug(slug);
  const listing = result.data ?? fallbackListing(slug);
  const theme = themeFor(result.data);
  const location = [
    listing.nearest_town,
    listing.admin_area_name,
    listing.country_name,
  ]
    .filter(Boolean)
    .join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "1200px",
          height: "900px",
          overflow: "hidden",
          background: theme.background,
          color: theme.text,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <svg
          width="1200"
          height="900"
          viewBox="0 0 1200 900"
          style={{ position: "absolute", inset: 0 }}
        >
          <rect width="1200" height="900" fill={theme.background} />
          <path
            d="M0 120 C170 60 250 190 390 126 C535 58 632 120 760 94 C940 56 1020 120 1200 72 L1200 900 L0 900 Z"
            fill={theme.land}
          />
          <path
            d="M0 400 C170 350 260 460 386 420 C520 378 650 446 780 394 C945 330 1020 380 1200 342 L1200 900 L0 900 Z"
            fill={theme.forest}
            opacity="0.72"
          />
          <path
            d="M-40 728 C154 626 304 704 486 624 C662 548 810 604 944 520 C1048 456 1126 462 1240 416 L1240 940 L-40 940 Z"
            fill={theme.forestDark}
            opacity="0.82"
          />
          {Array.from({ length: 9 }).map((_, index) => (
            <path
              key={`contour-${index}`}
              d={`M ${-80 + index * 32} ${176 + index * 58} C ${180 + index * 24} ${102 + index * 64}, ${384 + index * 30} ${246 + index * 44}, ${632 + index * 26} ${164 + index * 58} S ${934 + index * 22} ${220 + index * 50}, ${1280} ${130 + index * 54}`}
              fill="none"
              stroke={theme.contour}
              strokeWidth="3"
              opacity="0.32"
            />
          ))}
          <path
            d="M -60 640 C 150 590 270 612 422 542 C 590 466 690 514 850 420 C 1010 326 1120 354 1260 278"
            fill="none"
            stroke={theme.road}
            strokeWidth="16"
            opacity="0.68"
          />
          <path
            d="M 68 178 C 234 256 282 204 430 290 C 586 380 660 315 832 410 C 998 502 1046 456 1162 534"
            fill="none"
            stroke={theme.water}
            strokeWidth="10"
            opacity="0.7"
          />
          <path
            d={polygonPath(listing.public_boundary_geojson)}
            fill={theme.accent}
            fillOpacity="0.42"
            stroke="#fff8e7"
            strokeWidth="10"
            strokeLinejoin="round"
          />
          <path
            d={polygonPath(listing.public_boundary_geojson)}
            fill="none"
            stroke={theme.badge}
            strokeWidth="4"
            strokeLinejoin="round"
            strokeDasharray="12 10"
          />
          <rect width="1200" height="900" fill="url(#fade)" />
          <defs>
            <linearGradient id="fade" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.1" />
              <stop offset="52%" stopColor="#000000" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.58" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 60,
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderRadius: 10,
            background: theme.badge,
            padding: "12px 18px",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          <span>Huntfields</span>
          <span style={{ color: theme.accent }}>-</span>
          <span>{listing.listing_type_label}</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            bottom: 58,
            display: "flex",
            justifyContent: "space-between",
            gap: 36,
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                color: theme.subtext,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {location || theme.label}
            </div>
            <div
              style={{
                maxWidth: 760,
                fontSize: 70,
                lineHeight: 0.98,
                fontWeight: 900,
                letterSpacing: 0,
              }}
            >
              {listing.title}
            </div>
          </div>
          <div
            style={{
              minWidth: 260,
              borderRadius: 12,
              background: "rgba(255, 248, 231, 0.92)",
              color: "#203426",
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            <span>{formatAreaDisplay(listing)}</span>
            <span style={{ color: "#5c6f5b" }}>{formatPrice(listing)}</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 900,
    },
  );
}
