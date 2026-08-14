import { isValidGeoPoint, parseCoordinate } from "@/lib/geo/coordinates";

export type ResolvedAvailabilityCoords = {
  latitude: number;
  longitude: number;
  source: "requested" | "saved";
};

/** ON en el mapa: usa GPS enviado o, si falta, la última ubicación guardada. */
export function resolveAvailabilityCoordinates(input: {
  requestedLatitude: unknown;
  requestedLongitude: unknown;
  savedLatitude: unknown;
  savedLongitude: unknown;
}): ResolvedAvailabilityCoords | null {
  const requestedLatitude = parseCoordinate(input.requestedLatitude);
  const requestedLongitude = parseCoordinate(input.requestedLongitude);
  if (
    requestedLatitude != null &&
    requestedLongitude != null &&
    isValidGeoPoint({ latitude: requestedLatitude, longitude: requestedLongitude })
  ) {
    return { latitude: requestedLatitude, longitude: requestedLongitude, source: "requested" };
  }

  const savedLatitude = parseCoordinate(input.savedLatitude);
  const savedLongitude = parseCoordinate(input.savedLongitude);
  if (
    savedLatitude != null &&
    savedLongitude != null &&
    isValidGeoPoint({ latitude: savedLatitude, longitude: savedLongitude })
  ) {
    return { latitude: savedLatitude, longitude: savedLongitude, source: "saved" };
  }

  return null;
}
