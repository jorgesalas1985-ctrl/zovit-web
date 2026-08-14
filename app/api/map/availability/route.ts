import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAvailabilityCoordinates } from "@/lib/map/resolveAvailabilityCoordinates";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";

const AVAILABILITY_STATUSES = new Set(["available", "busy", "offline", "on_the_way"]);

/** Profesional: lee su estado de disponibilidad en el mapa. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "availability_status, location_sharing_enabled, latitude, longitude, location_updated_at, service_radius_km, can_act_as_professional, role"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      const hint = "No se pudo cargar tu disponibilidad.";
      const detail = error && process.env.NODE_ENV !== "production" ? ` ${error.message}` : "";
      return NextResponse.json({ error: `${hint}${detail}` }, { status: 500 });
    }

    const canPublish =
      data.role === "professional" || data.role === "admin" || data.can_act_as_professional === true;

    return NextResponse.json({
      availabilityStatus: AVAILABILITY_STATUSES.has(String(data.availability_status))
        ? data.availability_status
        : "offline",
      locationSharingEnabled: Boolean(data.location_sharing_enabled),
      latitude: data.latitude,
      longitude: data.longitude,
      locationUpdatedAt: data.location_updated_at,
      serviceRadiusKm: data.service_radius_km ?? 10,
      canPublish,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de disponibilidad.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Profesional: activar/desactivar aparición en el mapa cliente.
 * ON requiere coordenadas; OFF pasa a offline (conserva última ubicación).
 */
export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`map:availability:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, can_act_as_professional, availability_status, latitude, longitude")
      .eq("id", user.id)
      .maybeSingle();

    const canPublish =
      profile?.role === "professional" ||
      profile?.role === "admin" ||
      profile?.can_act_as_professional === true;

    if (!canPublish) {
      return NextResponse.json(
        { error: "Solo perfiles profesionales pueden publicarse en el mapa." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      available?: boolean;
      latitude?: number | string;
      longitude?: number | string;
      accuracy?: number | null;
      heartbeat?: boolean;
    };

    const available = Boolean(body.available);
    const current = String(profile?.availability_status ?? "offline");

    // No forzar "available" si el pro está en un trabajo activo (busy / on_the_way).
    if (
      available &&
      (current === "busy" || current === "on_the_way") &&
      !body.heartbeat
    ) {
      return NextResponse.json({
        ok: true,
        availabilityStatus: current,
        message: "Sigues en un servicio activo. La disponibilidad se actualizará al finalizar.",
      });
    }

    if (!available) {
      const { error } = await supabase
        .from("profiles")
        .update({
          availability_status: "offline",
          location_sharing_enabled: false,
          location_updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        return NextResponse.json(
          { error: "No se pudo desactivar. ¿Aplicaste la migración del mapa?" },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, availabilityStatus: "offline" });
    }

    const resolved = resolveAvailabilityCoordinates({
      requestedLatitude: body.latitude,
      requestedLongitude: body.longitude,
      savedLatitude: profile?.latitude,
      savedLongitude: profile?.longitude,
    });
    if (!resolved) {
      return NextResponse.json(
        {
          error:
            "Activa tu ubicación GPS o busca tu comuna para aparecer en el mapa.",
        },
        { status: 400 }
      );
    }

    const nextStatus =
      current === "busy" || current === "on_the_way" ? current : "available";

    const { error } = await supabase
      .from("profiles")
      .update({
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        availability_status: nextStatus,
        location_sharing_enabled: true,
        location_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      const hint = "No se pudo activar. ¿Aplicaste supabase/SPRINT_MAP_CLIENT_NEARBY.sql?";
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "production"
              ? hint
              : `${hint} ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      availabilityStatus: nextStatus,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      usedSavedLocation: resolved.source === "saved",
      message:
        resolved.source === "saved"
          ? "Te mostramos con tu última ubicación. Permite el GPS cuando puedas para actualizarla."
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de disponibilidad.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
