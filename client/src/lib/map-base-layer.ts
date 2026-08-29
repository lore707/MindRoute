import type L from "leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyleUrl, type MapStyle } from "@/lib/map-style";

export type MapBaseLayer = L.MaplibreGL;

/** Vector basemap hosted by OpenFreeMap, rendered below the existing Leaflet layers. */
export function createMapBaseLayer(style: MapStyle): MapBaseLayer {
  return maplibreGL({
    style: mapStyleUrl(style),
    interactive: false,
    attributionControl: false,
  });
}

/** MapLibre reports resource failures through its own map, not Leaflet tile events. */
export function attachMapBaseHealth(layer: MapBaseLayer, onChange: (healthy: boolean) => void): () => void {
  const map = layer.getMaplibreMap();
  let failures = 0;
  let unhealthy = false;
  const fail = () => {
    failures += 1;
    if (!unhealthy && failures >= 4) {
      unhealthy = true;
      onChange(false);
    }
  };
  const recover = () => {
    failures = 0;
    if (unhealthy) {
      unhealthy = false;
      onChange(true);
    }
  };
  map.on("error", fail);
  map.on("idle", recover);
  return () => {
    map.off("error", fail);
    map.off("idle", recover);
  };
}
