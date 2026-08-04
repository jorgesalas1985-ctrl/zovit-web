"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { AddressSearch } from "@/components/map/AddressSearch";
import { CoverageRadiusControl, MapFilters } from "@/components/map/MapFilters";
import {
  LocationPermissionNotice,
  UseMyLocationButton,
} from "@/components/map/MapControls";
import { NearbyProfessionalsSummary } from "@/components/map/NearbyProfessionalsSummary";
import {
  ProfessionalBottomSheet,
  ProfessionalMapCard,
} from "@/components/map/ProfessionalMapCard";
import { ServiceRequestModal } from "@/components/map/ServiceRequestModal";
import { LiveTrackingPanel } from "@/components/map/LiveTrackingPanel";
import {
  DEFAULT_MAP_CENTER,
} from "@/lib/geo/coordinates";
import type { ClientMapLocation } from "@/lib/geo/geocode";
import { requestBrowserLocation } from "@/lib/geo/locationPermission";
import { calculateDistanceKm, estimateArrivalMinutes } from "@/lib/geo/distance";
import {
  DEFAULT_MAP_FILTERS,
  MAP_TRACKING_STATUSES,
  type MapFiltersState,
  type MapProfessional,
} from "@/lib/map/types";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const ClientServiceMap = dynamic(
  () => import("@/components/map/ClientServiceMap").then((m) => m.ClientServiceMap),
  {
    ssr: false,
    loading: () => (
      <div className="mapSkeleton" aria-busy="true">
        <div className="mapSkeletonPulse" />
        <p>Cargando mapa…</p>
      </div>
    ),
  }
);

type Summary = { count: number; averageEtaMinutes: number | null };

function ClientMapExperience() {
  const [filters, setFilters] = useState<MapFiltersState>(DEFAULT_MAP_FILTERS);
  const [addressQuery, setAddressQuery] = useState("");
  const [location, setLocation] = useState<ClientMapLocation | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [professionals, setProfessionals] = useState<MapProfessional[]>([]);
  const [summary, setSummary] = useState<Summary>({ count: 0, averageEtaMinutes: null });
  const [loadingPros, setLoadingPros] = useState(false);
  const [prosError, setProsError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [trackingRequestId, setTrackingRequestId] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<string>("publicada");
  const [livePoint, setLivePoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [arrivalSuggested, setArrivalSuggested] = useState(false);

  const selected = useMemo(
    () => professionals.find((p) => p.id === selectedId) ?? null,
    [professionals, selectedId]
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const applyDefaultLocation = useCallback((message?: string) => {
    setLocation({
      ...DEFAULT_MAP_CENTER,
      formattedAddress: "Santiago Centro (ubicación aproximada)",
      commune: "Santiago",
      region: "Región Metropolitana",
      source: "default",
    });
    setAddressQuery("Santiago Centro");
    if (message) setPermissionMessage(message);
  }, []);

  const locateMe = useCallback(async () => {
    setLocating(true);
    const result = await requestBrowserLocation();
    setLocating(false);
    if (!result.ok) {
      applyDefaultLocation(result.message);
      return;
    }
    setPermissionMessage(null);
    setLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      formattedAddress: "Mi ubicación actual",
      commune: null,
      region: null,
      source: "geolocation",
    });
    setAddressQuery("Mi ubicación actual");
  }, [applyDefaultLocation]);

  useEffect(() => {
    void (async () => {
      setLocating(true);
      const result = await requestBrowserLocation({ timeoutMs: 8000 });
      setLocating(false);
      if (result.ok) {
        setLocation({
          latitude: result.latitude,
          longitude: result.longitude,
          formattedAddress: "Mi ubicación actual",
          commune: null,
          region: null,
          source: "geolocation",
        });
        setAddressQuery("Mi ubicación actual");
        return;
      }
      applyDefaultLocation(result.message);
    })();
  }, [applyDefaultLocation]);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingPros(true);
      setProsError("");
      try {
        const response = await fetch("/api/map/professionals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            ...filters,
          }),
        });
        const data = (await response.json()) as {
          professionals?: MapProfessional[];
          summary?: Summary;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setProsError(data.error || "No se pudieron cargar profesionales.");
          setProfessionals([]);
          setSummary({ count: 0, averageEtaMinutes: null });
          return;
        }
        setProfessionals(data.professionals ?? []);
        setSummary(data.summary ?? { count: 0, averageEtaMinutes: null });
      } catch {
        if (!cancelled) {
          setProsError("Error de red al buscar profesionales. Reintenta.");
          setProfessionals([]);
        }
      } finally {
        if (!cancelled) setLoadingPros(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [location, filters]);

  // Al montar: recupera solicitud activa (tracking o recién publicada).
  useEffect(() => {
    let cancelled = false;
    async function discoverActive() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: tracking } = await supabase
        .from("solicitudes_de_servicio")
        .select("id, status")
        .eq("client_id", user.id)
        .in("status", [...MAP_TRACKING_STATUSES])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tracking && !cancelled) {
        setTrackingRequestId(tracking.id);
        setTrackingStatus(tracking.status);
        return;
      }

      const { data: published } = await supabase
        .from("solicitudes_de_servicio")
        .select("id, status")
        .eq("client_id", user.id)
        .eq("status", "publicada")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (published && !cancelled) {
        setTrackingRequestId(published.id);
        setTrackingStatus(published.status);
      }
    }
    void discoverActive();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-enlaza realtime/poll cuando cambia la solicitud seguida o su estado.
  useEffect(() => {
    if (!trackingRequestId) {
      setLivePoint(null);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: number | undefined;
    let cancelled = false;

    const pullLive = async () => {
      const res = await fetch(`/api/map/live-location?serviceId=${trackingRequestId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        location?: { latitude: number; longitude: number } | null;
      };
      if (data.location) {
        setLivePoint({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        });
      }
    };

    async function bind() {
      const { data: row } = await supabase
        .from("solicitudes_de_servicio")
        .select("id, status")
        .eq("id", trackingRequestId)
        .maybeSingle();
      if (cancelled) return;
      if (!row) {
        setTrackingRequestId(null);
        return;
      }
      setTrackingStatus(row.status);

      channel = supabase
        .channel(`map-request-${trackingRequestId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "solicitudes_de_servicio",
            filter: `id=eq.${trackingRequestId}`,
          },
          (payload) => {
            const next = payload.new as { status?: string };
            if (!next?.status) return;
            setTrackingStatus(next.status);
            if (next.status === "finalizada" || next.status === "cancelada") {
              setLivePoint(null);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "service_live_locations",
            filter: `service_id=eq.${trackingRequestId}`,
          },
          (payload) => {
            const live = payload.new as { latitude?: number; longitude?: number };
            if (typeof live.latitude === "number" && typeof live.longitude === "number") {
              setLivePoint({ latitude: live.latitude, longitude: live.longitude });
            }
          }
        )
        .subscribe();
    }

    void bind();

    const canTrackLive = MAP_TRACKING_STATUSES.includes(
      trackingStatus as (typeof MAP_TRACKING_STATUSES)[number]
    );
    if (canTrackLive) {
      void pullLive();
      poll = window.setInterval(() => void pullLive(), 10_000);
    } else {
      setLivePoint(null);
    }

    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [trackingRequestId, trackingStatus]);

  useEffect(() => {
    if (!livePoint || !location) {
      setArrivalSuggested(false);
      return;
    }
    const distanceM =
      calculateDistanceKm(livePoint.latitude, livePoint.longitude, location.latitude, location.longitude) *
      1000;
    setArrivalSuggested(distanceM <= 100);
  }, [livePoint, location]);

  const liveEta = useMemo(() => {
    if (!livePoint || !location) return null;
    const km = calculateDistanceKm(
      livePoint.latitude,
      livePoint.longitude,
      location.latitude,
      location.longitude
    );
    return { km, minutes: estimateArrivalMinutes(km) };
  }, [livePoint, location]);

  const effectiveLocation: ClientMapLocation = location ?? {
    ...DEFAULT_MAP_CENTER,
    formattedAddress: "Santiago Centro (ubicación aproximada)",
    commune: "Santiago",
    region: "Región Metropolitana",
    source: "default",
  };

  return (
    <div className="clientMapPage">
      <aside className="clientMapSidebar">
        <div className="clientMapSidebarHead">
          <p className="kicker">MAPA CLIENTE</p>
          <h1>Profesionales cerca de ti</h1>
          <p className="muted">
            Encuentra especialistas verificados, calcula llegada estimada y solicita el servicio.
          </p>
        </div>

        {permissionMessage && (
          <LocationPermissionNotice
            message={permissionMessage}
            onUseLocation={() => void locateMe()}
            onDismiss={() => setPermissionMessage(null)}
          />
        )}

        <UseMyLocationButton onClick={() => void locateMe()} busy={locating} />

        <AddressSearch
          value={addressQuery}
          onChange={setAddressQuery}
          onSelect={(suggestion) => {
            setPermissionMessage(null);
            setLocation({
              latitude: suggestion.latitude,
              longitude: suggestion.longitude,
              formattedAddress: suggestion.formattedAddress,
              commune: suggestion.commune,
              region: suggestion.region,
              source: "search",
            });
          }}
        />

        <CoverageRadiusControl
          radiusKm={filters.radiusKm}
          onChange={(radiusKm) => setFilters((prev) => ({ ...prev, radiusKm }))}
        />

        <NearbyProfessionalsSummary
          count={summary.count}
          averageEtaMinutes={summary.averageEtaMinutes}
          loading={loadingPros}
        />

        {prosError && (
          <div className="formMessage" role="alert">
            {prosError}{" "}
            <button
              type="button"
              className="textLink"
              onClick={() => setFilters((f) => ({ ...f }))}
            >
              Reintentar
            </button>
          </div>
        )}

        <MapFilters filters={filters} onChange={setFilters} />

        {!isMobile && selected && (
          <ProfessionalMapCard
            professional={selected}
            onClose={() => setSelectedId(null)}
            onRequest={() => setRequestOpen(true)}
          />
        )}

        {trackingRequestId && (
          <LiveTrackingPanel
            requestId={trackingRequestId}
            status={trackingStatus}
            etaMinutes={liveEta?.minutes}
            distanceKm={liveEta?.km}
            arrivalSuggested={arrivalSuggested}
          />
        )}
      </aside>

      <div className="clientMapMain">
        {isMobile && (
          <div className="clientMapMobileTop">
            <AddressSearch
              value={addressQuery}
              onChange={setAddressQuery}
              onSelect={(suggestion) => {
                setLocation({
                  latitude: suggestion.latitude,
                  longitude: suggestion.longitude,
                  formattedAddress: suggestion.formattedAddress,
                  commune: suggestion.commune,
                  region: suggestion.region,
                  source: "search",
                });
              }}
            />
            <div className="mapChipRow mapChipRowScroll">
              <CoverageRadiusControl
                radiusKm={filters.radiusKm}
                onChange={(radiusKm) => setFilters((prev) => ({ ...prev, radiusKm }))}
              />
            </div>
          </div>
        )}

        <ClientServiceMap
          location={location}
          radiusKm={filters.radiusKm}
          professionals={professionals}
          selectedId={selectedId}
          onSelectProfessional={setSelectedId}
          liveProfessional={livePoint}
        />

        {loadingPros && (
          <div className="mapLoadingBadge" aria-live="polite">
            <Loader2 size={14} className="spinIcon" /> Cargando…
          </div>
        )}

        {isMobile && selected && (
          <ProfessionalBottomSheet
            professional={selected}
            onClose={() => setSelectedId(null)}
            onRequest={() => setRequestOpen(true)}
          />
        )}
      </div>

      <ServiceRequestModal
        open={requestOpen}
        professional={selected}
        location={effectiveLocation}
        onClose={() => setRequestOpen(false)}
        onCreated={(id) => {
          setTrackingRequestId(id);
          setTrackingStatus("publicada");
        }}
      />
    </div>
  );
}

export function ClientMapPage() {
  return (
    <Protected>
      <RoleGuard requiredMode="client">
        <ClientMapExperience />
      </RoleGuard>
    </Protected>
  );
}
