import { recommendProfessionals } from "@/lib/ai/recommendProfessionals";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`ai:recommend:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = (await request.json()) as { query?: string; commune?: string };
    const query = body.query?.trim() ?? "";

    if (query.length < 8) {
      return NextResponse.json(
        { error: "Describe tu problema con al menos 8 caracteres." },
        { status: 400 },
      );
    }

    const result = await recommendProfessionals(query, body.commune);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo analizar la consulta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
