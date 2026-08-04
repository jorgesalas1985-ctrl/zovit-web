import { NextResponse } from "next/server";
import { mapNominatimResults } from "@/lib/geo/geocode";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";

/**
 * Proxy Nominatim (OSM) — centraliza User-Agent y rate limit.
 * Reemplazable por otro proveedor sin tocar el frontend.
 */
export async function GET(request: Request) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`map:geocode:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(8, Math.max(1, Number(searchParams.get("limit") || 5)));

  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: String(limit),
    countrycodes: "cl",
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ZOVIT-Map/1.0 (https://zovit.cl; soporte@zovit.cl)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "El servicio de direcciones no respondió. Intenta más tarde." },
        { status: 502 }
      );
    }

    const rows = (await response.json()) as Parameters<typeof mapNominatimResults>[0];
    return NextResponse.json({ suggestions: mapNominatimResults(rows) });
  } catch {
    return NextResponse.json(
      { error: "No fue posible buscar esa dirección." },
      { status: 502 }
    );
  }
}
