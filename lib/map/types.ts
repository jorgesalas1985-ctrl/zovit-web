export type MapAvailabilityStatus = "available" | "busy" | "offline" | "on_the_way";

export type MapProfessional = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  commune: string | null;
  experienceLevel: string;
  serviceCategories: string[];
  specialties: string[];
  completedJobs: number;
  averageRating: number;
  ratingCount: number;
  identityVerified: boolean;
  biometricVerified: boolean;
  availabilityStatus: MapAvailabilityStatus;
  latitude: number;
  longitude: number;
  distanceKm: number;
  etaMinutes: number;
  primaryServiceProfile: string | null;
  certified: boolean;
};

export type MapFiltersState = {
  category: string;
  specialty: string;
  availability: "" | MapAvailabilityStatus;
  radiusKm: number;
  minRating: number;
  verifiedOnly: boolean;
  certifiedOnly: boolean;
};

export const MAP_FILTER_CHIPS = [
  "Gasfitería",
  "Electricidad",
  "Mecánica",
  "Pintura",
  "Carpintería",
  "Climatización",
  "Construcción",
  "Limpieza",
] as const;

export const DEFAULT_MAP_FILTERS: MapFiltersState = {
  category: "",
  specialty: "",
  availability: "",
  radiusKm: 5,
  minRating: 0,
  verifiedOnly: false,
  certifiedOnly: false,
};

/** Estados ZOVIT existentes (no inventar nombres nuevos en BD). */
export const MAP_TRACKING_STATUSES = ["aceptada", "en_camino", "en_ejecucion"] as const;

export function availabilityLabel(status: MapAvailabilityStatus): string {
  switch (status) {
    case "available":
      return "Disponible";
    case "busy":
      return "Ocupado";
    case "on_the_way":
      return "En camino";
    default:
      return "No disponible";
  }
}

export function availabilityTone(status: MapAvailabilityStatus): "green" | "yellow" | "blue" | "muted" {
  switch (status) {
    case "available":
      return "green";
    case "busy":
      return "yellow";
    case "on_the_way":
      return "blue";
    default:
      return "muted";
  }
}
