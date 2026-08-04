import type { GeoPoint } from "@/lib/geo/coordinates";

export type GeocodeSuggestion = {
  id: string;
  label: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  commune: string | null;
  region: string | null;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
  };
};

/**
 * Cliente de geocodificación (Nominatim / OSM).
 * Centralizado para poder reemplazar el proveedor después.
 * Preferir llamar vía /api/map/geocode (User-Agent + rate limit).
 */
export async function geocodeAddress(
  query: string,
  options?: { signal?: AbortSignal; limit?: number }
): Promise<GeocodeSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: String(options?.limit ?? 5),
    countrycodes: "cl",
  });

  const response = await fetch(`/api/map/geocode?${params.toString()}`, {
    signal: options?.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No fue posible buscar esa dirección. Intenta de nuevo.");
  }

  const data = (await response.json()) as { suggestions?: GeocodeSuggestion[]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.suggestions ?? [];
}

export function mapNominatimResults(rows: NominatimResult[]): GeocodeSuggestion[] {
  return rows.map((row) => {
    const commune =
      row.address?.suburb ||
      row.address?.neighbourhood ||
      row.address?.city ||
      row.address?.town ||
      row.address?.village ||
      row.address?.municipality ||
      row.address?.county ||
      null;
    const region = row.address?.state || row.address?.region || null;

    return {
      id: String(row.place_id),
      label: row.display_name,
      formattedAddress: row.display_name,
      latitude: Number(row.lat),
      longitude: Number(row.lon),
      commune,
      region,
    };
  });
}

export type ClientMapLocation = GeoPoint & {
  formattedAddress: string;
  commune: string | null;
  region: string | null;
  source: "geolocation" | "search" | "default";
};
