import L from "leaflet";
import { mapStyleUrl, type MapStyle } from "@/lib/map-style";

export type MapBaseLayer = L.TileLayer;

/** Raster basemap rendered natively by Leaflet: no WebGL or compatibility bridge. */
export function createMapBaseLayer(style: MapStyle): MapBaseLayer {
  return L.tileLayer(mapStyleUrl(style), {
    minZoom: 2,
    maxZoom: 19,
    keepBuffer: 4,
    updateWhenIdle: false,
    crossOrigin: true,
  });
}

/** Report a real outage without hiding markers or controls. */
export function attachMapBaseHealth(layer: MapBaseLayer, onChange: (healthy: boolean) => void): () => void {
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
  layer.on("tileerror", fail);
  layer.on("tileload", recover);
  return () => {
    layer.off("tileerror", fail);
    layer.off("tileload", recover);
  };
}
