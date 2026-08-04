import { createClient } from "@/lib/supabase/server";
import { calculateDistanceKm, estimateArrivalMinutes } from "@/lib/geo/distance";
import { isValidGeoPoint } from "@/lib/geo/coordinates";
import type { MapAvailabilityStatus, MapFiltersState, MapProfessional } from "@/lib/map/types";

type NearbyRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  commune: string | null;
  experience_level: string | null;
  service_categories: string[] | null;
  specialties: string[] | null;
  completed_jobs: number | null;
  average_rating: number | null;
  rating_count: number | null;
  identity_verified: boolean | null;
  biometric_verified: boolean | null;
  availability_status: string | null;
  latitude: number;
  longitude: number;
  distance_km: number | null;
  primary_service_profile: string | null;
};

function mapRow(row: NearbyRow, clientLat: number, clientLng: number): MapProfessional | null {
  if (!isValidGeoPoint({ latitude: row.latitude, longitude: row.longitude })) return null;

  const distanceKm =
    typeof row.distance_km === "number" && Number.isFinite(row.distance_km)
      ? Number(row.distance_km)
      : calculateDistanceKm(clientLat, clientLng, row.latitude, row.longitude);

  const availability = (row.availability_status ?? "offline") as MapAvailabilityStatus;
  const experienceLevel = row.experience_level ?? "junior";
  const primary = row.primary_service_profile;
  const firstName = row.first_name?.trim() || "Profesional";
  const lastName = row.last_name?.trim() || "";

  return {
    id: row.id,
    firstName,
    lastName,
    displayName: [firstName, lastName].filter(Boolean).join(" "),
    avatarUrl: row.avatar_url,
    commune: row.commune,
    experienceLevel,
    serviceCategories: row.service_categories ?? [],
    specialties: row.specialties ?? [],
    completedJobs: Number(row.completed_jobs ?? 0),
    averageRating: Number(row.average_rating ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    identityVerified: Boolean(row.identity_verified),
    biometricVerified: Boolean(row.biometric_verified),
    availabilityStatus: ["available", "busy", "offline", "on_the_way"].includes(availability)
      ? availability
      : "offline",
    latitude: row.latitude,
    longitude: row.longitude,
    distanceKm,
    etaMinutes: estimateArrivalMinutes(distanceKm),
    primaryServiceProfile: primary,
    certified: experienceLevel === "verified" || experienceLevel === "expert" || primary === "certified",
  };
}

function sortProfessionals(list: MapProfessional[]): MapProfessional[] {
  const rank: Record<string, number> = {
    available: 0,
    on_the_way: 1,
    busy: 2,
    offline: 3,
  };
  return [...list].sort((a, b) => {
    const ra = rank[a.availabilityStatus] ?? 9;
    const rb = rank[b.availabilityStatus] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
    return b.completedJobs - a.completedJobs;
  });
}

/** Fallback si el RPC aún no está aplicado: consulta perfiles con geo. */
async function fallbackNearbyQuery(
  latitude: number,
  longitude: number,
  filters: MapFiltersState
): Promise<MapProfessional[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, avatar_url, commune, experience_level, service_categories, specialties, identity_verified, biometric_verified, availability_status, latitude, longitude, primary_service_profile, public_profile, role, can_act_as_professional"
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .neq("availability_status", "offline")
    .limit(120);

  if (error || !data) return [];

  const mapped = data
    .filter((row) => {
      const isPro = row.role === "professional" || row.can_act_as_professional === true;
      if (!isPro) return false;
      if (row.public_profile === false) return false;
      if (!isValidGeoPoint({ latitude: row.latitude, longitude: row.longitude })) return false;

      const distance = calculateDistanceKm(latitude, longitude, row.latitude, row.longitude);
      if (distance > filters.radiusKm) return false;

      if (filters.availability && row.availability_status !== filters.availability) return false;

      if (filters.category) {
        const cats = (row.service_categories as string[] | null) ?? [];
        const hit = cats.some((c) => c.toLowerCase().includes(filters.category.toLowerCase()));
        if (!hit) return false;
      }

      if (filters.specialty) {
        const specs = (row.specialties as string[] | null) ?? [];
        const hit = specs.some((s) => s.toLowerCase().includes(filters.specialty.toLowerCase()));
        if (!hit) return false;
      }

      if (filters.verifiedOnly && !row.identity_verified && !row.biometric_verified) return false;

      if (filters.certifiedOnly) {
        const level = row.experience_level as string | null;
        const primary = row.primary_service_profile as string | null;
        if (level !== "verified" && level !== "expert" && primary !== "certified") return false;
      }

      return true;
    })
    .map((row) =>
      mapRow(
        {
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          avatar_url: row.avatar_url,
          commune: row.commune,
          experience_level: row.experience_level as string | null,
          service_categories: row.service_categories as string[] | null,
          specialties: row.specialties as string[] | null,
          completed_jobs: 0,
          average_rating: 0,
          rating_count: 0,
          identity_verified: row.identity_verified,
          biometric_verified: row.biometric_verified,
          availability_status: row.availability_status as string | null,
          latitude: row.latitude as number,
          longitude: row.longitude as number,
          distance_km: null,
          primary_service_profile: row.primary_service_profile as string | null,
        },
        latitude,
        longitude
      )
    )
    .filter((p): p is MapProfessional => !!p)
    .filter((p) => p.averageRating >= filters.minRating);

  return sortProfessionals(mapped).slice(0, 40);
}

export async function searchNearbyProfessionals(
  latitude: number,
  longitude: number,
  filters: MapFiltersState
): Promise<{ professionals: MapProfessional[]; source: "rpc" | "fallback" }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_nearby_professionals", {
    p_lat: latitude,
    p_lng: longitude,
    p_radius_km: filters.radiusKm,
    p_category: filters.category || null,
    p_specialty: filters.specialty || null,
    p_min_rating: filters.minRating,
    p_verified_only: filters.verifiedOnly,
    p_certified_only: filters.certifiedOnly,
    p_availability: filters.availability || null,
    p_limit: 40,
  });

  if (error || !data) {
    const fallback = await fallbackNearbyQuery(latitude, longitude, filters);
    return { professionals: fallback, source: "fallback" };
  }

  const professionals = sortProfessionals(
    (data as NearbyRow[])
      .map((row) => mapRow(row, latitude, longitude))
      .filter((p): p is MapProfessional => !!p)
      .filter((p) => p.averageRating >= filters.minRating)
  );

  return { professionals, source: "rpc" };
}

export function summarizeNearby(professionals: MapProfessional[]): {
  count: number;
  averageEtaMinutes: number | null;
} {
  const available = professionals.filter((p) => p.availabilityStatus === "available");
  const pool = available.length > 0 ? available : professionals;
  if (pool.length === 0) return { count: 0, averageEtaMinutes: null };
  const avg = Math.round(pool.reduce((sum, p) => sum + p.etaMinutes, 0) / pool.length);
  return { count: professionals.length, averageEtaMinutes: avg };
}
