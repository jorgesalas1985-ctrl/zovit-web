/** Distancia geodésica aproximada (km) — fórmula de Haversine. */
export function calculateDistanceKm(
  clientLatitude: number,
  clientLongitude: number,
  professionalLatitude: number,
  professionalLongitude: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(professionalLatitude - clientLatitude);
  const dLng = toRad(professionalLongitude - clientLongitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(clientLatitude)) *
      Math.cos(toRad(professionalLatitude)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** ETA urbano aproximado (min) asumiendo ~25 km/h promedio. No inventa tráfico real. */
export function estimateArrivalMinutes(distanceKm: number, averageSpeedKmh = 25): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  const speed = averageSpeedKmh > 0 ? averageSpeedKmh : 25;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}

export function formatDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return "—";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

export function formatEtaMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Geocerca: true si está dentro del radio (metros), considerando precisión GPS. */
export function isWithinGeofenceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number,
  accuracyMeters = 0
): boolean {
  const distanceM = calculateDistanceKm(lat1, lng1, lat2, lng2) * 1000;
  const effectiveRadius = radiusMeters + Math.max(0, Math.min(accuracyMeters, 50));
  return distanceM <= effectiveRadius;
}
