export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidGeoPoint(point: Partial<GeoPoint> | null | undefined): point is GeoPoint {
  return !!point && isValidLatitude(point.latitude) && isValidLongitude(point.longitude);
}

export function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Santiago centro — fallback amable si el usuario deniega geolocalización. */
export const DEFAULT_MAP_CENTER: GeoPoint = {
  latitude: -33.4489,
  longitude: -70.6693,
};

export const DEFAULT_COVERAGE_RADIUS_KM = 5;
export const COVERAGE_RADIUS_OPTIONS_KM = [2, 5, 10, 20] as const;
export const ARRIVAL_GEOFENCE_METERS = 100;
