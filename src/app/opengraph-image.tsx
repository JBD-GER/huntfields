import { ImageResponse } from "next/og";
import { site } from "@/lib/seo/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #102016 0%, #183326 48%, #d99a61 140%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "76px",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "#e7c196",
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 7,
            textTransform: "uppercase",
          }}
        >
          Huntfields
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 950,
              letterSpacing: -2,
              lineHeight: 0.96,
              maxWidth: 920,
            }}
          >
            Hunting leases and private land access.
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: 30,
              lineHeight: 1.35,
              marginTop: 32,
              maxWidth: 800,
            }}
          >
            {site.description}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
