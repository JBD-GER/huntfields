"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import area from "@turf/area";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  ValidateNotSelfIntersecting,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { MousePointer2, Pencil, Trash2 } from "lucide-react";
import { fallbackRasterStyle, getMapStyle } from "@/lib/maps/style";
import { formatAreaDisplay } from "@/lib/area-format";
import type { Feature, GeoJsonProperties, Polygon } from "geojson";

export type PolygonEditorValue = {
  geometry: Polygon | null;
  areaAcres: number;
  areaHectares: number;
};

const initialCenter: [number, number] = [-98.5795, 39.8283];

export function PolygonEditor({
  name = "boundary_geojson",
  onValueChange,
}: {
  name?: string;
  onValueChange?: (value: PolygonEditorValue) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const [mode, setMode] = useState<"polygon" | "select">("polygon");
  const [geojson, setGeojson] = useState("");
  const [areaAcres, setAreaAcres] = useState(0);
  const [areaHectares, setAreaHectares] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(),
      center: initialCenter,
      zoom: 3,
      attributionControl: { compact: true },
    });

    map.on("error", (event) => {
      if (map.getStyle()?.sources?.["osm-raster"]) {
        return;
      }

      console.warn("Map style failed to load, switching to fallback.", event);
      map.setStyle(fallbackRasterStyle);
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawPolygonMode({
            editable: true,
            showCoordinatePoints: true,
            validation: ValidateNotSelfIntersecting,
            styles: {
              fillColor: "#6f8f3d",
              fillOpacity: 0.22,
              outlineColor: "#234331",
              outlineOpacity: 0.95,
              outlineWidth: 2,
              closingPointColor: "#c76b2f",
              closingPointOpacity: 1,
              closingPointOutlineColor: "#ffffff",
              closingPointOutlineOpacity: 1,
              closingPointOutlineWidth: 2,
              closingPointWidth: 7,
              coordinatePointColor: "#234331",
              coordinatePointOpacity: 1,
              coordinatePointOutlineColor: "#ffffff",
              coordinatePointOutlineOpacity: 1,
              coordinatePointOutlineWidth: 2,
              coordinatePointWidth: 6,
              editedPointColor: "#c76b2f",
              editedPointOpacity: 1,
              editedPointOutlineColor: "#ffffff",
              editedPointOutlineOpacity: 1,
              editedPointOutlineWidth: 2,
              editedPointWidth: 7,
              snappingPointColor: "#2f6f8f",
              snappingPointOpacity: 1,
              snappingPointOutlineColor: "#ffffff",
              snappingPointOutlineOpacity: 1,
              snappingPointOutlineWidth: 2,
              snappingPointWidth: 7,
            },
          }),
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  coordinates: {
                    draggable: true,
                    midpoints: { draggable: true },
                    deletable: true,
                  },
                },
              },
            },
          }),
        ],
      });

      const sync = () => {
        const polygon = draw
          .getSnapshot()
          .find((feature) => feature.geometry.type === "Polygon") as
          | Feature<Polygon, GeoJsonProperties>
          | undefined;

        if (!polygon) {
          setGeojson("");
          setAreaAcres(0);
          setAreaHectares(0);
          onValueChange?.({ geometry: null, areaAcres: 0, areaHectares: 0 });
          return;
        }

        const squareMeters = area(polygon);
        const acres = Number((squareMeters / 4046.8564224).toFixed(2));
        const hectares = Number((squareMeters / 10000).toFixed(2));

        setGeojson(JSON.stringify(polygon.geometry));
        setAreaAcres(acres);
        setAreaHectares(hectares);
        onValueChange?.({
          geometry: polygon.geometry,
          areaAcres: acres,
          areaHectares: hectares,
        });
      };

      const finishDrawing = () => {
        sync();
        draw.setMode("select");
        setMode("select");
      };

      draw.start();
      draw.setMode("polygon");
      draw.on("finish", finishDrawing);
      draw.on("change", sync);
      drawRef.current = draw;
    });

    return () => {
      drawRef.current?.stop();
      map.remove();
      drawRef.current = null;
      mapRef.current = null;
    };
  }, [onValueChange]);

  function setDrawMode(nextMode: "polygon" | "select") {
    drawRef.current?.setMode(nextMode);
    setMode(nextMode);
  }

  function clearPolygon() {
    const draw = drawRef.current;

    if (!draw) {
      return;
    }

    const ids = draw
      .getSnapshot()
      .map((feature) => feature.id)
      .filter((id): id is string | number => id !== undefined);

    draw.removeFeatures(ids);
    setGeojson("");
    setAreaAcres(0);
    setAreaHectares(0);
    setDrawMode("polygon");
  }

  return (
    <div className="grid gap-3">
      <input name={name} type="hidden" value={geojson} readOnly />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Draw polygon"
            aria-label="Draw polygon"
            onClick={() => setDrawMode("polygon")}
            className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
              mode === "polygon"
                ? "border-[#234331] bg-[#234331] text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            <Pencil size={17} aria-hidden="true" />
            Draw
          </button>
          <button
            type="button"
            title="Edit polygon"
            aria-label="Edit polygon"
            onClick={() => setDrawMode("select")}
            className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
              mode === "select"
                ? "border-[#234331] bg-[#234331] text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            <MousePointer2 size={17} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            title="Clear polygon"
            aria-label="Clear polygon"
            onClick={clearPolygon}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 transition hover:border-red-400 hover:text-red-700"
          >
            <Trash2 size={17} aria-hidden="true" />
            Clear
          </button>
        </div>
        <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800">
          {formatAreaDisplay({
            area_acres: areaAcres,
            area_hectares: areaHectares,
          })}
        </div>
      </div>
      <div
        ref={containerRef}
        className="min-h-[420px] overflow-hidden rounded-md border border-stone-200 bg-stone-200"
        aria-label="Draw exact land access polygon"
      />
    </div>
  );
}
