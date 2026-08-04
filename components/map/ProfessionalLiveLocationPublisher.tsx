"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Navigation } from "lucide-react";
import { MAP_TRACKING_STATUSES } from "@/lib/map/types";

type ProfessionalLiveLocationPublisherProps = {
  serviceId: string;
  status: string;
  enabled: boolean;
};

/**
 * Publica GPS del profesional durante servicios activos (aceptada / en_camino / en_ejecucion).
 */
export function ProfessionalLiveLocationPublisher({
  serviceId,
  status,
  enabled,
}: ProfessionalLiveLocationPublisherProps) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [arrivalSuggested, setArrivalSuggested] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const active =
    enabled && MAP_TRACKING_STATUSES.includes(status as (typeof MAP_TRACKING_STATUSES)[number]);

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current != null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharing(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Tu navegador no permite compartir ubicación en vivo.");
      return;
    }

    let cancelled = false;
    setError("");
    setSharing(true);

    const push = async (latitude: number, longitude: number, accuracy: number | null, heading: number | null, speed: number | null) => {
      try {
        const res = await fetch("/api/map/live-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId,
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
          }),
        });
        const data = (await res.json()) as { error?: string; arrivalSuggested?: boolean };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "No se pudo enviar la ubicación.");
          return;
        }
        setError("");
        setLastAt(new Date().toISOString());
        setArrivalSuggested(Boolean(data.arrivalSuggested));
      } catch {
        if (!cancelled) setError("Error de red al compartir ubicación.");
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void push(
          pos.coords.latitude,
          pos.coords.longitude,
          Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          Number.isFinite(pos.coords.speed) ? pos.coords.speed : null
        );
      },
      (err) => {
        if (cancelled) return;
        if (err.code === err.PERMISSION_DENIED) {
          setError("Activa el permiso de ubicación para que el cliente te vea en camino.");
        } else {
          setError("No pudimos obtener tu GPS. Revisa el permiso de ubicación.");
        }
        setSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 8_000,
        timeout: 20_000,
      }
    );

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active, serviceId]);

  if (!enabled) return null;
  if (!MAP_TRACKING_STATUSES.includes(status as (typeof MAP_TRACKING_STATUSES)[number])) {
    return null;
  }

  return (
    <section className="proLiveShareCard" aria-live="polite">
      <div className="proLiveShareHead">
        <Navigation size={18} aria-hidden />
        <div>
          <p className="kicker">UBICACIÓN EN VIVO</p>
          <h3>{sharing ? "Compartiendo con el cliente" : "Activando GPS…"}</h3>
        </div>
        {sharing && !error ? <Loader2 size={16} className="spinIcon" aria-hidden /> : null}
      </div>
      {lastAt && (
        <p className="fieldHint">
          Último envío {new Date(lastAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
      {arrivalSuggested && (
        <div className="mapArrivalBanner" role="status">
          Estás cerca del cliente (≤ 100 m). Puedes marcar llegada en las acciones del servicio.
        </div>
      )}
      {error && (
        <div className="formMessage" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
