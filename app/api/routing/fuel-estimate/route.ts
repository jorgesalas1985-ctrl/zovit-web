import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseCoordinate } from "@/lib/geo/coordinates";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { clientIpFromRequest, rateLimit, rateLimitResponse } from "@/lib/security/rateLimit";
import { NextResponse } from "next/server";

type Point = { latitude: number; longitude: number };
type FuelStation = Point & { name: string };

const DEFAULT_PRICING = { fuelBaseFare: 4000, fuelDayKmRate: 600, fuelNightKmRate: 800, fuelHighDemandKmRate: 1000, fuelMinuteRate: 100, fuelNightStartsAt: 22, fuelNightEndsAt: 7 };
const stationCache = new Map<string, { until: number; stations: FuelStation[] }>();

function directDistanceKm(a: Point, b: Point) {
  const earthRadiusKm = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function santiagoHour() {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "2-digit", hourCycle: "h23" }).format(new Date());
  return Number(hour);
}

function isNight(pricing: typeof DEFAULT_PRICING) {
  const hour = santiagoHour();
  return pricing.fuelNightStartsAt > pricing.fuelNightEndsAt
    ? hour >= pricing.fuelNightStartsAt || hour < pricing.fuelNightEndsAt
    : hour >= pricing.fuelNightStartsAt && hour < pricing.fuelNightEndsAt;
}

async function nearestFuelStations(origin: Point): Promise<FuelStation[]> {
  const cacheKey = `${origin.latitude.toFixed(2)}:${origin.longitude.toFixed(2)}`;
  const cached = stationCache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.stations;

  // Consulta puntual y cacheada: no es un barrido ni autocompletado sobre el servicio público de OSM.
  const query = `[out:json][timeout:20];(node["amenity"="fuel"](around:50000,${origin.latitude},${origin.longitude});way["amenity"="fuel"](around:50000,${origin.latitude},${origin.longitude}););out center;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ZOVIT/1.0 fuel-estimate" },
    body: `data=${encodeURIComponent(query)}`,
    next: { revalidate: 1800 },
  });
  if (!response.ok) throw new Error("No fue posible encontrar bencineras cercanas.");
  const payload = await response.json() as { elements?: Array<{ lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: { name?: string; brand?: string } }> };
  const stations = (payload.elements ?? [])
    .map((item): FuelStation | null => {
      const latitude = item.lat ?? item.center?.lat;
      const longitude = item.lon ?? item.center?.lon;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { latitude: Number(latitude), longitude: Number(longitude), name: item.tags?.name || item.tags?.brand || "Bencinera cercana" };
    })
    .filter((station): station is FuelStation => station !== null)
    .sort((a, b) => directDistanceKm(origin, a) - directDistanceKm(origin, b))
    .slice(0, 6);
  stationCache.set(cacheKey, { stations, until: Date.now() + 30 * 60_000 });
  return stations;
}

async function routeViaStation(origin: Point, station: FuelStation, destination: Point) {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) throw new Error("Aún no está configurada la ruta automática gratuita.");
  const url = `https://api.heigit.org/openrouteservice/v2/directions/driving-car?api_key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [[origin.longitude, origin.latitude], [station.longitude, station.latitude], [destination.longitude, destination.latitude]] }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No fue posible calcular la ruta.");
  const payload = await response.json() as { routes?: Array<{ summary?: { distance?: number; duration?: number } }> };
  const summary = payload.routes?.[0]?.summary;
  if (!summary || !Number.isFinite(summary.distance) || !Number.isFinite(summary.duration)) throw new Error("La ruta no devolvió una estimación válida.");
  return { station, distanceMeters: Math.round(Number(summary.distance)), durationSeconds: Math.round(Number(summary.duration)) };
}

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);
    const limited = rateLimit(`routing:fuel:${clientIpFromRequest(request)}`, { limit: 8, windowMs: 60_000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

    const body = await request.json() as { professional?: Point; client?: Point };
    const professional = { latitude: parseCoordinate(body.professional?.latitude), longitude: parseCoordinate(body.professional?.longitude) };
    const client = { latitude: parseCoordinate(body.client?.latitude), longitude: parseCoordinate(body.client?.longitude) };
    if (professional.latitude === null || professional.longitude === null || client.latitude === null || client.longitude === null) {
      return NextResponse.json({ error: "Faltan ubicaciones válidas para calcular la ruta." }, { status: 400 });
    }
    const origin: Point = { latitude: professional.latitude, longitude: professional.longitude };
    const destination: Point = { latitude: client.latitude, longitude: client.longitude };
    const { data: storedPricing } = await createAdminClient().from("platform_work_pricing").select("fuel_base_fare,fuel_day_km_rate,fuel_night_km_rate,fuel_high_demand_km_rate,fuel_minute_rate,fuel_night_starts_at,fuel_night_ends_at").eq("id", true).maybeSingle();
    const pricing = {
      fuelBaseFare: Number(storedPricing?.fuel_base_fare ?? DEFAULT_PRICING.fuelBaseFare),
      fuelDayKmRate: Number(storedPricing?.fuel_day_km_rate ?? DEFAULT_PRICING.fuelDayKmRate),
      fuelNightKmRate: Number(storedPricing?.fuel_night_km_rate ?? DEFAULT_PRICING.fuelNightKmRate),
      fuelHighDemandKmRate: Number(storedPricing?.fuel_high_demand_km_rate ?? DEFAULT_PRICING.fuelHighDemandKmRate),
      fuelMinuteRate: Number(storedPricing?.fuel_minute_rate ?? DEFAULT_PRICING.fuelMinuteRate),
      fuelNightStartsAt: Number(storedPricing?.fuel_night_starts_at ?? DEFAULT_PRICING.fuelNightStartsAt),
      fuelNightEndsAt: Number(storedPricing?.fuel_night_ends_at ?? DEFAULT_PRICING.fuelNightEndsAt),
    };
    const stations = await nearestFuelStations(origin);
    if (!stations.length) return NextResponse.json({ error: "No encontramos una bencinera para estimar esta solicitud." }, { status: 422 });
    const routes = await Promise.allSettled(stations.map((station) => routeViaStation(origin, station, destination)));
    const best = routes
      .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof routeViaStation>>> => result.status === "fulfilled")
      .map((result) => result.value)
      .sort((a, b) => a.durationSeconds - b.durationSeconds)[0];
    if (!best) return NextResponse.json({ error: "No fue posible obtener una ruta para esta solicitud." }, { status: 502 });
    const distanceKm = best.distanceMeters / 1000;
    const minutes = Math.ceil(best.durationSeconds / 60);
    const ratePerKm = isNight(pricing) ? pricing.fuelNightKmRate : pricing.fuelDayKmRate;
    const variableService = Math.round(distanceKm * ratePerKm + minutes * pricing.fuelMinuteRate);
    const serviceEstimate = Math.max(pricing.fuelBaseFare, variableService);
    return NextResponse.json({
      station: { name: best.station.name, latitude: best.station.latitude, longitude: best.station.longitude },
      distanceMeters: best.distanceMeters,
      durationSeconds: best.durationSeconds,
      distanceKm: Number(distanceKm.toFixed(1)),
      minutes,
      serviceEstimate,
      rateMode: isNight(pricing) ? "nocturna" : "diurna",
      note: "Estimación automática de traslado; la bencina solicitada se cobra por separado.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible calcular el servicio de combustible." }, { status: 500 });
  }
}
