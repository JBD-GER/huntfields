"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import area from "@turf/area";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  ValidateNotSelfIntersecting,
  type GeoJSONStoreFeatures,
  type GeoJSONStoreGeometries,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { CheckCircle2, MousePointer2, Pencil, Plus, Trash2 } from "lucide-react";
import { fallbackRasterStyle, getMapStyle } from "@/lib/maps/style";
import { formatAreaDisplay } from "@/lib/area-format";
import type { MultiPolygon, Polygon } from "geojson";

export type PolygonEditorValue = {
  geometry: Polygon | MultiPolygon | null;
  areaAcres: number;
  areaHectares: number;
};

type StoreFeature = GeoJSONStoreFeatures<GeoJSONStoreGeometries>;
type PolygonFeature = GeoJSONStoreFeatures<Polygon>;

const initialCenter: [number, number] = [-98.5795, 39.8283];

function isFinishedPolygon(feature: StoreFeature): feature is PolygonFeature {
  return (
    feature.geometry.type === "Polygon" &&
    !Boolean(feature.properties?.currentlyDrawing)
  );
}

function combinePolygons(
  polygons: PolygonFeature[],
): Polygon | MultiPolygon | null {
  if (polygons.length === 0) {
    return null;
  }

  if (polygons.length === 1) {
    return polygons[0].geometry;
  }

  return {
    type: "MultiPolygon",
    coordinates: polygons.map((polygon) => polygon.geometry.coordinates),
  };
}

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
  const [hasPolygon, setHasPolygon] = useState(false);
  const [polygonCount, setPolygonCount] = useState(0);

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
        const polygons = draw.getSnapshot().filter(isFinishedPolygon);
        const storedGeometry = combinePolygons(polygons);

        if (!storedGeometry) {
          setGeojson("");
          setAreaAcres(0);
          setAreaHectares(0);
          setHasPolygon(false);
          setPolygonCount(0);
          onValueChange?.({ geometry: null, areaAcres: 0, areaHectares: 0 });
          return;
        }

        const squareMeters = polygons.reduce(
          (total, polygon) => total + area(polygon),
          0,
        );
        const acres = Number((squareMeters / 4046.8564224).toFixed(2));
        const hectares = Number((squareMeters / 10000).toFixed(2));

        setGeojson(JSON.stringify(storedGeometry));
        setAreaAcres(acres);
        setAreaHectares(hectares);
        setHasPolygon(true);
        setPolygonCount(polygons.length);
        onValueChange?.({
          geometry: storedGeometry,
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

  function addAnotherArea() {
    setDrawMode("polygon");
  }

  function finishEditing() {
    setDrawMode("select");
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
    setHasPolygon(false);
    setPolygonCount(0);
    setDrawMode("polygon");
  }

  const statusText = hasPolygon
    ? `${polygonCount} saved ${polygonCount === 1 ? "area" : "areas"}`
    : "No area saved yet";
  const helpText =
    mode === "polygon"
      ? "Click each corner. Press Enter or click the orange first point to save the shape."
      : hasPolygon
        ? "Drag corners or midpoint handles to refine the saved boundary."
        : "Start by drawing the hunting area boundary.";

  return (
    <div className="grid gap-3">
      <input name={name} type="hidden" value={geojson} readOnly />
      <div className="grid gap-3 rounded-md border border-stone-200 bg-white p-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c76b2f]">
              {statusText}
            </p>
            <p className="mt-1 text-sm font-semibold leading-5 text-stone-600">
              {helpText}
            </p>
          </div>
          <div className="rounded-md border border-stone-200 bg-[#faf8f1] px-3 py-2 text-center text-sm font-semibold text-stone-800 md:text-left">
            {formatAreaDisplay({
              area_acres: areaAcres,
              area_hectares: areaHectares,
            })}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto_auto_auto]">
          <button
            type="button"
            title="Draw hunting area"
            aria-label="Draw hunting area"
            onClick={() => setDrawMode("polygon")}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
              mode === "polygon"
                ? "border-[#234331] bg-[#234331] text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            <Pencil size={17} aria-hidden="true" />
            {hasPolygon ? "Draw area" : "Start drawing"}
          </button>
          <button
            type="button"
            title="Move boundary points"
            aria-label="Move boundary points"
            onClick={() => setDrawMode("select")}
            disabled={!hasPolygon}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition disabled:opacity-45 ${
              mode === "select"
                ? "border-[#234331] bg-[#234331] text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            <MousePointer2 size={17} aria-hidden="true" />
            Edit points
          </button>
          <button
            type="button"
            title="Save current map areas"
            aria-label="Save current map areas"
            onClick={finishEditing}
            disabled={!hasPolygon}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#234331]/20 bg-[#eef3ec] px-3 text-sm font-bold text-[#183326] transition hover:border-[#234331]/40 hover:bg-[#e5eee2] disabled:opacity-45"
          >
            <CheckCircle2 size={17} aria-hidden="true" />
            Done
          </button>
          <button
            type="button"
            title="Add another separate area"
            aria-label="Add another separate area"
            onClick={addAnotherArea}
            disabled={!hasPolygon}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 transition hover:border-[#234331] hover:text-[#183326] disabled:opacity-45"
          >
            <Plus size={17} aria-hidden="true" />
            Add area
          </button>
          <button
            type="button"
            title="Clear all areas"
            aria-label="Clear all areas"
            onClick={clearPolygon}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 transition hover:border-red-400 hover:text-red-700 lg:col-start-auto"
          >
            <Trash2 size={17} aria-hidden="true" />
            Clear all
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="min-h-[300px] overflow-hidden rounded-md border border-stone-200 bg-stone-200 sm:min-h-[380px] lg:min-h-[420px]"
        aria-label="Draw exact land access polygon"
      />
    </div>
  );
}
