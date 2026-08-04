import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isWithinGeofenceMeters } from "@/lib/geo/distance";
import { ARRIVAL_GEOFENCE_METERS, parseCoordinate } from "@/lib/geo/coordinates";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";

/** Profesional actualiza su ubicación en vivo (solo si es parte del servicio). */
export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`map:live:${ip}`, { limit: 60, windowMs: 60_000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const body = (await request.json()) as {
      serviceId?: string;
      latitude?: number | string;
      longitude?: number | string;
      heading?: number | null;
      speed?: number | null;
      accuracy?: number | null;
    };

    const latitude = parseCoordinate(body.latitude);
    const longitude = parseCoordinate(body.longitude);
    if (!body.serviceId || latitude === null || longitude === null) {
      return NextResponse.json({ error: "Datos de ubicación incompletos." }, { status: 400 });
    }

    const { data: service } = await supabase
      .from("solicitudes_de_servicio")
      .select("id, professional_id, client_id, status, client_latitude, client_longitude")
      .eq("id", body.serviceId)
      .maybeSingle();

    if (!service || service.professional_id !== user.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (!["aceptada", "en_camino", "en_ejecucion"].includes(service.status)) {
      return NextResponse.json(
        { error: "La ubicación en vivo solo aplica en servicios activos." },
        { status: 400 }
      );
    }

    const accuracy = typeof body.accuracy === "number" ? body.accuracy : null;

    const { error } = await supabase.from("service_live_locations").upsert(
      {
        service_id: body.serviceId,
        professional_id: user.id,
        latitude,
        longitude,
        heading: typeof body.heading === "number" ? body.heading : null,
        speed: typeof body.speed === "number" ? body.speed : null,
        accuracy,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "service_id" }
    );

    if (error) {
      return NextResponse.json(
        { error: "No fue posible guardar la ubicación. ¿Aplicaste la migración del mapa?" },
        { status: 500 }
      );
    }

    // Actualizar punto aproximado del perfil (sin dirección).
    await supabase
      .from("profiles")
      .update({
        latitude,
        longitude,
        location_updated_at: new Date().toISOString(),
        availability_status: service.status === "en_camino" ? "on_the_way" : "busy",
        location_sharing_enabled: true,
      })
      .eq("id", user.id);

    let arrivalSuggested = false;
    if (
      typeof service.client_latitude === "number" &&
      typeof service.client_longitude === "number"
    ) {
      arrivalSuggested = isWithinGeofenceMeters(
        latitude,
        longitude,
        service.client_latitude,
        service.client_longitude,
        ARRIVAL_GEOFENCE_METERS,
        accuracy ?? 0
      );
    }

    return NextResponse.json({ ok: true, arrivalSuggested });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de ubicación en vivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Cliente/profesional lee la última ubicación (RLS). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId requerido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("service_live_locations")
    .select("latitude, longitude, heading, speed, accuracy, recorded_at, professional_id")
    .eq("service_id", serviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ location: null });
  }

  return NextResponse.json({ location: data });
}
