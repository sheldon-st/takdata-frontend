"use client";

import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import Draw, { createBox } from "ol/interaction/Draw";
import Feature from "ol/Feature";
import { Polygon } from "ol/geom";
import { Style, Fill, Stroke } from "ol/style";
import { fromLonLat, transformExtent } from "ol/proj";
import type { DrawEvent } from "ol/interaction/Draw";
import "ol/ol.css";
import { Button } from "@/components/ui/button";
import { MapPin, X, MousePointer2 } from "lucide-react";

export interface GeoFilterBbox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

interface GeoFilterMapProps {
  value: GeoFilterBbox | null;
  onChange: (bbox: GeoFilterBbox | null) => void;
}

const BOX_STYLE = new Style({
  fill: new Fill({ color: "rgba(59, 130, 246, 0.18)" }),
  stroke: new Stroke({ color: "#3b82f6", width: 2 }),
});

const DRAW_STYLE = new Style({
  fill: new Fill({ color: "rgba(59, 130, 246, 0.1)" }),
  stroke: new Stroke({ color: "#3b82f6", width: 2, lineDash: [6, 4] }),
});

function bboxToExtent3857(bbox: GeoFilterBbox): number[] {
  return transformExtent(
    [bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat],
    "EPSG:4326",
    "EPSG:3857",
  );
}

function extent3857ToBbox(extent: number[]): GeoFilterBbox {
  const [minLon, minLat, maxLon, maxLat] = transformExtent(
    extent,
    "EPSG:3857",
    "EPSG:4326",
  );
  return {
    min_lat: Math.min(minLat, maxLat),
    max_lat: Math.max(minLat, maxLat),
    min_lon: Math.min(minLon, maxLon),
    max_lon: Math.max(minLon, maxLon),
  };
}

export default function GeoFilterMap({ value, onChange }: GeoFilterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  // Keep onChange stable in effects
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // ── Initialise OL map once ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    // Seed the vector layer with the initial value if present
    if (value) {
      const ext = bboxToExtent3857(value);
      const poly = new Polygon([
        [
          [ext[0], ext[1]],
          [ext[0], ext[3]],
          [ext[2], ext[3]],
          [ext[2], ext[1]],
          [ext[0], ext[1]],
        ],
      ]);
      vectorSource.addFeature(new Feature({ geometry: poly }));
    }

    const vectorLayer = new VectorLayer({ source: vectorSource, style: BOX_STYLE });

    const map = new Map({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), vectorLayer],
      view: new View({
        center: value
          ? fromLonLat([
              (value.min_lon + value.max_lon) / 2,
              (value.min_lat + value.max_lat) / 2,
            ])
          : fromLonLat([0, 30]),
        zoom: value ? 4 : 2,
      }),
    });
    mapRef.current = map;

    const draw = new Draw({
      source: vectorSource,
      type: "Circle",
      geometryFunction: createBox(),
      style: DRAW_STYLE,
    });

    draw.on("drawstart", () => {
      vectorSource.clear();
    });

    draw.on("drawend", (evt: DrawEvent) => {
      const geom = evt.feature.getGeometry() as Polygon;
      const bbox = extent3857ToBbox(geom.getExtent());
      onChangeRef.current(bbox);
    });

    map.addInteraction(draw);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      vectorSourceRef.current = null;
    };
    // Intentionally empty deps — map initialised once; value sync handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync value → map when changed externally (e.g. "Clear" button) ────────
  useEffect(() => {
    const vs = vectorSourceRef.current;
    if (!vs) return;

    vs.clear();
    if (value) {
      const ext = bboxToExtent3857(value);
      const poly = new Polygon([
        [
          [ext[0], ext[1]],
          [ext[0], ext[3]],
          [ext[2], ext[3]],
          [ext[2], ext[1]],
          [ext[0], ext[1]],
        ],
      ]);
      vs.addFeature(new Feature({ geometry: poly }));
    }
  }, [value]);

  const handleClear = () => {
    vectorSourceRef.current?.clear();
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {/* Instruction hint */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MousePointer2 className="h-3.5 w-3.5 shrink-0" />
        Click and drag on the map to draw a bounding box filter
      </p>

      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-md border border-border"
        style={{ height: 280 }}
      />

      {/* Bbox summary / clear */}
      {value ? (
        <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs dark:border-blue-800 dark:bg-blue-950/30">
          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="font-mono">
              {value.min_lat.toFixed(3)}°,&nbsp;{value.min_lon.toFixed(3)}°&nbsp;→&nbsp;
              {value.max_lat.toFixed(3)}°,&nbsp;{value.max_lon.toFixed(3)}°
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No geographic filter — all aircraft worldwide will be processed.
        </p>
      )}
    </div>
  );
}
