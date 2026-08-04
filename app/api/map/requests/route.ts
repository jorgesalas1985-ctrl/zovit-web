import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMapServiceRequest } from "@/lib/map/createMapRequest";
import { parseCoordinate } from "@/lib/geo/coordinates";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";
import { canPublishServiceRequest } from "@/lib/auth/roles";
import { isValidUuid } from "@/lib/security/validation";

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`map:request:${ip}`, { limit: 20, windowMs: 60_000 });
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
      .select("role, can_act_as_client, can_act_as_professional, active_mode")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !canPublishServiceRequest(profile)) {
      return NextResponse.json(
        { error: "Cambia a modo cliente para crear una solicitud." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      professionalId?: string | null;
      category?: string;
      description?: string;
      address?: string;
      latitude?: number | string;
      longitude?: number | string;
      commune?: string | null;
      region?: string | null;
      urgency?: "low" | "normal" | "high" | "emergency";
      estimatedBudget?: number | null;
      scheduledFor?: string | null;
    };

    const latitude = parseCoordinate(body.latitude);
    const longitude = parseCoordinate(body.longitude);

    if (body.professionalId && !isValidUuid(body.professionalId)) {
      return NextResponse.json({ error: "professionalId inválido." }, { status: 400 });
    }

    if (!body.category || !body.description || !body.address || latitude === null || longitude === null) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios de la solicitud." },
        { status: 400 }
      );
    }

    const created = await createMapServiceRequest({
      clientId: user.id,
      professionalId: body.professionalId || null,
      category: body.category,
      description: body.description,
      address: body.address,
      latitude,
      longitude,
      commune: body.commune,
      region: body.region,
      urgency: body.urgency,
      estimatedBudget: body.estimatedBudget,
      scheduledFor: body.scheduledFor,
    });

    if (created?.id) {
      void fetch(new URL(`/api/requests/${created.id}/auto-match`, request.url), {
        method: "POST",
        headers: { cookie: request.headers.get("cookie") ?? "" },
      }).catch(() => undefined);
    }

    return NextResponse.json({ id: created?.id, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear la solicitud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
