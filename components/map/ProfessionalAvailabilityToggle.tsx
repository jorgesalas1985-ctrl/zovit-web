"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Radio } from "lucide-react";
import { AddressSearch } from "@/components/map/AddressSearch";
import { requestBrowserLocation } from "@/lib/geo/locationPermission";
import { isValidGeoPoint } from "@/lib/geo/coordinates";
import type { GeocodeSuggestion } from "@/lib/geo/geocode";
import {
  availabilityLabel,
  availabilityTone,
  type MapAvailabilityStatus,
} from "@/lib/map/types";

type AvailabilityPayload = {
  availabilityStatus?: MapAvailabilityStatus;
  locationSharingEnabled?: boolean;
  locationUpdatedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  canPublish?: boolean;
  error?: string;
  message?: string;
  ok?: boolean;
  usedSavedLocation?: boolean;
};

type ProfessionalAvailabilityToggleProps = {
  compact?: boolean;
};

type GeoCoords = { latitude: number; longitude: number };

async function readJson(response: Response): Promise<AvailabilityPayload> {
  const text = await response.text();
  try {
    return JSON.parse(text) as AvailabilityPayload;
  } catch {
    throw new Error("No se pudo actualizar. Recarga e intenta de nuevo.");
  }
}

export function ProfessionalAvailabilityToggle({
  compact = false,
}: ProfessionalAvailabilityToggleProps) {
  const [status, setStatus] = useState<MapAvailabilityStatus>("offline");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [canPublish, setCanPublish] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const lastCoordsRef = useRef<GeoCoords | null>(null);

  const isOnline = status === "available" || status === "busy" || status === "on_the_way";
  const tone = availabilityTone(status);

  const rememberCoords = useCallback((latitude?: number | null, longitude?: number | null) => {
    const point = { latitude: latitude ?? Number.NaN, longitude: longitude ?? Number.NaN };
    if (!isValidGeoPoint(point)) return;
    lastCoordsRef.current = point;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/map/availability", { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "No se pudo cargar disponibilidad.");
      setStatus((data.availabilityStatus as MapAvailabilityStatus) || "offline");
      setCanPublish(data.canPublish !== false);
      setUpdatedAt(data.locationUpdatedAt ?? null);
      rememberCoords(data.latitude, data.longitude);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar disponibilidad.");
    } finally {
      setLoading(false);
    }
  }, [rememberCoords]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = useCallback(
    async (
      available: boolean,
      options?: { heartbeat?: boolean; coords?: GeoCoords; accuracy?: number | null },
    ) => {
      const heartbeat = Boolean(options?.heartbeat);
      if (!heartbeat) {
        setBusy(true);
        setError("");
        setHint("");
      }
      try {
        let latitude = options?.coords?.latitude;
        let longitude = options?.coords?.longitude;
        let accuracy = options?.accuracy;

        if (available && latitude == null && longitude == null) {
          const loc = await requestBrowserLocation({
            timeoutMs: heartbeat ? 8_000 : 10_000,
            maximumAgeMs: heartbeat ? 45_000 : 8_000,
            enableHighAccuracy: !heartbeat,
            usage: "availability",
          });
          if (loc.ok) {
            latitude = loc.latitude;
            longitude = loc.longitude;
            accuracy = loc.accuracy;
          } else if (heartbeat && lastCoordsRef.current) {
            latitude = lastCoordsRef.current.latitude;
            longitude = lastCoordsRef.current.longitude;
          } else if (!heartbeat && lastCoordsRef.current) {
            latitude = lastCoordsRef.current.latitude;
            longitude = lastCoordsRef.current.longitude;
            setHint("Usamos tu última ubicación. Permite el GPS cuando puedas para actualizarla.");
          } else if (!heartbeat) {
            setShowManualLocation(true);
            throw new Error(loc.message);
          } else {
            return;
          }
        }

        const res = await fetch("/api/map/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available, latitude, longitude, accuracy, heartbeat }),
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "No se pudo actualizar.");

        setStatus((data.availabilityStatus as MapAvailabilityStatus) || (available ? "available" : "offline"));
        setUpdatedAt(new Date().toISOString());
        rememberCoords(data.latitude, data.longitude);
        if (available) setShowManualLocation(false);
        if (data.message) setHint(data.message);
      } catch (err) {
        if (!heartbeat) {
          setError(err instanceof Error ? err.message : "No se pudo actualizar disponibilidad.");
        }
      } finally {
        if (!heartbeat) setBusy(false);
      }
    },
    [rememberCoords],
  );

  // Heartbeat: refrescar GPS mientras esté visible en el mapa.
  useEffect(() => {
    if (!isOnline) return;
    const tick = window.setInterval(() => {
      void publish(true, { heartbeat: true });
    }, 45_000);
    return () => window.clearInterval(tick);
  }, [isOnline, publish]);

  function onSelectAddress(suggestion: GeocodeSuggestion) {
    setAddressQuery(suggestion.formattedAddress);
    void publish(true, {
      coords: { latitude: suggestion.latitude, longitude: suggestion.longitude },
    });
  }

  if (!canPublish && !loading) return null;

  return (
    <section className={`proAvailabilityCard${compact ? " proAvailabilityCard--compact" : ""}`}>
      <div className="proAvailabilityHead">
        <div>
          <p className="kicker">MAPA ZOVIT</p>
          <h2>{compact ? "Disponibilidad" : "Aparecer en el mapa"}</h2>
          {!compact && (
            <p className="muted">
              Activa tu ubicación para que clientes cercanos te vean y puedan solicitarte.
            </p>
          )}
        </div>
        <span className={`statusPill statusPill--${tone}`} aria-live="polite">
          <Radio size={14} aria-hidden />
          {loading ? "…" : availabilityLabel(status)}
        </span>
      </div>

      <div className="proAvailabilityActions">
        <button
          type="button"
          className={`accountModeOption${isOnline ? " accountModeOption--active" : ""}`}
          disabled={busy || loading}
          onClick={() => void publish(true)}
        >
          {busy && !isOnline ? <Loader2 size={16} className="spinIcon" /> : <MapPin size={16} />}
          Estoy disponible
        </button>
        <button
          type="button"
          className={`accountModeOption${!isOnline ? " accountModeOption--active" : ""}`}
          disabled={busy || loading}
          onClick={() => void publish(false)}
        >
          No disponible
        </button>
      </div>

      {showManualLocation && (
        <AddressSearch
          value={addressQuery}
          onChange={setAddressQuery}
          onSelect={onSelectAddress}
          disabled={busy}
          label="Tu comuna o dirección aproximada"
          inputId="pro-availability-address"
          placeholder="Ej: Puente Alto, Santiago…"
        />
      )}

      {updatedAt && isOnline && (
        <p className="fieldHint">
          Ubicación actualizada {new Date(updatedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {hint && <p className="fieldHint">{hint}</p>}
      {error && (
        <div className="formMessage" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
