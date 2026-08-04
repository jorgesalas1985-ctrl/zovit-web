"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Radio } from "lucide-react";
import { requestBrowserLocation } from "@/lib/geo/locationPermission";
import {
  availabilityLabel,
  availabilityTone,
  type MapAvailabilityStatus,
} from "@/lib/map/types";

type AvailabilityPayload = {
  availabilityStatus?: MapAvailabilityStatus;
  locationSharingEnabled?: boolean;
  locationUpdatedAt?: string | null;
  canPublish?: boolean;
  error?: string;
  message?: string;
  ok?: boolean;
};

type ProfessionalAvailabilityToggleProps = {
  compact?: boolean;
};

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

  const isOnline = status === "available" || status === "busy" || status === "on_the_way";
  const tone = availabilityTone(status);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/map/availability", { cache: "no-store" });
      const data = (await res.json()) as AvailabilityPayload;
      if (!res.ok) throw new Error(data.error || "No se pudo cargar disponibilidad.");
      setStatus((data.availabilityStatus as MapAvailabilityStatus) || "offline");
      setCanPublish(data.canPublish !== false);
      setUpdatedAt(data.locationUpdatedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar disponibilidad.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = useCallback(
    async (available: boolean, heartbeat = false) => {
      setBusy(true);
      setError("");
      setHint("");
      try {
        let latitude: number | undefined;
        let longitude: number | undefined;
        let accuracy: number | null | undefined;

        if (available) {
          const loc = await requestBrowserLocation({
            timeoutMs: 12_000,
            maximumAgeMs: heartbeat ? 20_000 : 5_000,
            enableHighAccuracy: !heartbeat,
          });
          if (!loc.ok) {
            throw new Error(loc.message);
          }
          latitude = loc.latitude;
          longitude = loc.longitude;
          accuracy = loc.accuracy;
        }

        const res = await fetch("/api/map/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available, latitude, longitude, accuracy, heartbeat }),
        });
        const data = (await res.json()) as AvailabilityPayload;
        if (!res.ok) throw new Error(data.error || "No se pudo actualizar.");

        setStatus((data.availabilityStatus as MapAvailabilityStatus) || (available ? "available" : "offline"));
        setUpdatedAt(new Date().toISOString());
        if (data.message) setHint(data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar disponibilidad.");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  // Heartbeat: refrescar GPS mientras esté visible en el mapa.
  useEffect(() => {
    if (!isOnline) return;
    const tick = window.setInterval(() => {
      void publish(true, true);
    }, 45_000);
    return () => window.clearInterval(tick);
  }, [isOnline, publish]);

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
