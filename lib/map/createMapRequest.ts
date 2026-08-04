import { createClient } from "@/lib/supabase/server";
import { isValidGeoPoint } from "@/lib/geo/coordinates";

export type CreateMapServiceRequestInput = {
  clientId: string;
  professionalId: string | null;
  category: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  commune?: string | null;
  region?: string | null;
  urgency?: "low" | "normal" | "high" | "emergency";
  estimatedBudget?: number | null;
  scheduledFor?: string | null;
};

export async function createMapServiceRequest(input: CreateMapServiceRequestInput) {
  if (!input.category.trim() || !input.description.trim() || !input.address.trim()) {
    throw new Error("Completa categoría, descripción y dirección.");
  }
  if (!isValidGeoPoint({ latitude: input.latitude, longitude: input.longitude })) {
    throw new Error("La ubicación del servicio no es válida.");
  }

  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    client_id: input.clientId,
    category: input.category.trim(),
    description: input.description.trim(),
    address: input.address.trim(),
    status: "publicada",
    client_latitude: input.latitude,
    client_longitude: input.longitude,
    service_commune: input.commune ?? null,
    service_region: input.region ?? null,
    urgency: input.urgency ?? "normal",
    estimated_budget: input.estimatedBudget ?? null,
    scheduled_for: input.scheduledFor || null,
    source: "map",
  };

  if (input.professionalId) {
    payload.professional_id = input.professionalId;
  }

  const { data, error } = await supabase
    .from("solicitudes_de_servicio")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    // Si faltan columnas geo (migración no aplicada), reintentar con columnas base.
    if (/column|client_latitude|source|urgency/i.test(error.message)) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("solicitudes_de_servicio")
        .insert({
          client_id: input.clientId,
          category: input.category.trim(),
          description: input.description.trim(),
          address: input.address.trim(),
          status: "publicada",
          ...(input.professionalId ? { professional_id: input.professionalId } : {}),
        })
        .select("id")
        .single();

      if (fallbackError) throw new Error(fallbackError.message);
      return fallback;
    }
    throw new Error(error.message);
  }

  return data;
}
