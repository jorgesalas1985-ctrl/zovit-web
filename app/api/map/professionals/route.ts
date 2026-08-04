import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCoordinate } from "@/lib/geo/coordinates";
import { searchNearbyProfessionals, summarizeNearby } from "@/lib/map/nearbyProfessionals";
import type { MapFiltersState } from "@/lib/map/types";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`map:pros:${ip}`, { limit: 40, windowMs: 60_000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const body = (await request.json()) as Partial<MapFiltersState> & {
      latitude?: number | string;
      longitude?: number | string;
    };

    const latitude = parseCoordinate(body.latitude);
    const longitude = parseCoordinate(body.longitude);
    if (latitude === null || longitude === null) {
      return NextResponse.json({ error: "Ubicación inválida." }, { status: 400 });
    }

    const filters: MapFiltersState = {
      category: typeof body.category === "string" ? body.category : "",
      specialty: typeof body.specialty === "string" ? body.specialty : "",
      availability:
        body.availability === "available" ||
        body.availability === "busy" ||
        body.availability === "on_the_way"
          ? body.availability
          : "",
      radiusKm: [2, 5, 10, 20].includes(Number(body.radiusKm)) ? Number(body.radiusKm) : 5,
      minRating: Math.max(0, Math.min(5, Number(body.minRating) || 0)),
      verifiedOnly: Boolean(body.verifiedOnly),
      certifiedOnly: Boolean(body.certifiedOnly),
    };

    const { professionals, source } = await searchNearbyProfessionals(latitude, longitude, filters);
    const summary = summarizeNearby(professionals);

    return NextResponse.json({
      professionals,
      summary,
      source,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar profesionales cercanos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
