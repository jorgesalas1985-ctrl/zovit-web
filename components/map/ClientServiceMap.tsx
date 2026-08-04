"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ClientMapLocation } from "@/lib/geo/geocode";
import type { MapProfessional } from "@/lib/map/types";
import { availabilityTone } from "@/lib/map/types";
import { RecenterMapButton } from "@/components/map/MapControls";

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

type ClientServiceMapProps = {
  location: ClientMapLocation | null;
  radiusKm: number;
  professionals: MapProfessional[];
  selectedId: string | null;
  onSelectProfessional: (id: string | null) => void;
  liveProfessional?: { latitude: number; longitude: number } | null;
  mapError?: string | null;
};

function createClientEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "mapMarkerClient";
  el.innerHTML = `<span class="mapMarkerClientPulse"></span><span class="mapMarkerClientDot"></span>`;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Tu ubicación");
  return el;
}

function createProEl(pro: MapProfessional, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  const tone = availabilityTone(pro.availabilityStatus);
  el.className = `mapMarkerPro mapTone-${tone} ${selected ? "isSelected" : ""}`;
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", `${pro.displayName}, ${pro.availabilityStatus}`);
  const initial = pro.firstName.slice(0, 1).toUpperCase();
  if (pro.avatarUrl) {
    el.innerHTML = `<img src="${pro.avatarUrl.replace(/"/g, "")}" alt="" /><span class="mapMarkerStatus"></span>`;
  } else {
    el.innerHTML = `<span class="mapMarkerInitial">${initial}</span><span class="mapMarkerStatus"></span>`;
  }
  return el;
}

export function ClientServiceMap({
  location,
  radiusKm,
  professionals,
  selectedId,
  onSelectProfessional,
  liveProfessional,
  mapError,
}: ClientServiceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const clientMarkerRef = useRef<Marker | null>(null);
  const proMarkersRef = useRef<Map<string, Marker>>(new Map());
  const liveMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE,
        center: location
          ? [location.longitude, location.latitude]
          : [-70.6693, -33.4489],
        zoom: 12,
        attributionControl: { compact: true },
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      mapRef.current = map;
      const markersAtMount = proMarkersRef.current;

      map.on("load", () => {
        setReady(true);
        if (!map.getSource("coverage")) {
          map.addSource("coverage", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "coverage-fill",
            type: "fill",
            source: "coverage",
            paint: {
              "fill-color": "#7c5cff",
              "fill-opacity": 0.12,
            },
          });
          map.addLayer({
            id: "coverage-line",
            type: "line",
            source: "coverage",
            paint: {
              "line-color": "#38bdf8",
              "line-width": 2,
              "line-opacity": 0.7,
            },
          });
        }
      });

      map.on("error", () => {
        setInitError("No fue posible cargar el mapa. Revisa tu conexión e intenta de nuevo.");
      });

      return () => {
        markersAtMount.forEach((m) => m.remove());
        markersAtMount.clear();
        clientMarkerRef.current?.remove();
        liveMarkerRef.current?.remove();
        map.remove();
        mapRef.current = null;
      };
    } catch {
      setInitError("El mapa no pudo iniciarse en este dispositivo.");
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const circleGeoJson = useCallback((lat: number, lng: number, km: number) => {
    const points = 64;
    const coords: [number, number][] = [];
    const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
    const distanceY = km / 110.574;
    for (let i = 0; i <= points; i += 1) {
      const theta = (i / points) * 2 * Math.PI;
      coords.push([lng + distanceX * Math.cos(theta), lat + distanceY * Math.sin(theta)]);
    }
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Polygon" as const, coordinates: [coords] },
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !location) return;

    map.easeTo({
      center: [location.longitude, location.latitude],
      zoom: radiusKm <= 2 ? 14 : radiusKm <= 5 ? 12.5 : radiusKm <= 10 ? 11.5 : 10.5,
      duration: 600,
    });

    if (!clientMarkerRef.current) {
      clientMarkerRef.current = new maplibregl.Marker({ element: createClientEl() })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map);
    } else {
      clientMarkerRef.current.setLngLat([location.longitude, location.latitude]);
    }

    const source = map.getSource("coverage") as GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: [circleGeoJson(location.latitude, location.longitude, radiusKm)],
    });
  }, [location, radiusKm, ready, circleGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const keep = new Set(professionals.map((p) => p.id));
    proMarkersRef.current.forEach((marker, id) => {
      if (!keep.has(id)) {
        marker.remove();
        proMarkersRef.current.delete(id);
      }
    });

    professionals.forEach((pro) => {
      const existing = proMarkersRef.current.get(pro.id);
      if (existing) {
        existing.setLngLat([pro.longitude, pro.latitude]);
        const el = existing.getElement();
        el.classList.toggle("isSelected", selectedId === pro.id);
        return;
      }

      const el = createProEl(pro, selectedId === pro.id);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pro.longitude, pro.latitude])
        .addTo(map);

      const select = () => onSelectProfessional(pro.id);
      el.addEventListener("click", select);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          select();
        }
      });

      proMarkersRef.current.set(pro.id, marker);
    });
  }, [professionals, ready, selectedId, onSelectProfessional]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!liveProfessional) {
      liveMarkerRef.current?.remove();
      liveMarkerRef.current = null;
      return;
    }

    if (!liveMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "mapMarkerLive";
      el.setAttribute("aria-label", "Profesional en camino");
      liveMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([liveProfessional.longitude, liveProfessional.latitude])
        .addTo(map);
    } else {
      liveMarkerRef.current.setLngLat([liveProfessional.longitude, liveProfessional.latitude]);
    }

    if (location) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([location.longitude, location.latitude]);
      bounds.extend([liveProfessional.longitude, liveProfessional.latitude]);
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 700 });
    }
  }, [liveProfessional, location, ready]);

  function recenter() {
    if (!mapRef.current || !location) return;
    mapRef.current.easeTo({
      center: [location.longitude, location.latitude],
      zoom: 13,
      duration: 500,
    });
  }

  const error = mapError || initError;

  return (
    <div className="mapCanvasWrap">
      {!ready && !error && (
        <div className="mapSkeleton" aria-busy="true" aria-label="Cargando mapa">
          <div className="mapSkeletonPulse" />
          <p>Cargando mapa…</p>
        </div>
      )}
      {error && (
        <div className="mapErrorState" role="alert">
          <p>{error}</p>
          <button type="button" className="secondaryButton" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      )}
      <div ref={containerRef} className="mapCanvas" role="application" aria-label="Mapa de profesionales" />
      <div className="mapFabStack">
        <RecenterMapButton onClick={recenter} disabled={!location} />
      </div>
    </div>
  );
}
