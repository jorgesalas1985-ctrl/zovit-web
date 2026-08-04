import { parseServiceQuery } from "@/lib/ai/parseQuery";
import { createAdminClient } from "@/lib/supabase/admin";

type SearchRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  match_score: number | null;
};

/**
 * Invita automáticamente a los mejores profesionales cuando se publica una solicitud.
 * Respuestas rápidas: el cliente no espera a que alguien “descubra” el trabajo.
 */
export async function inviteProfessionalsForRequest(requestId: string): Promise<{
  invited: number;
  skipped: boolean;
  reason?: string;
}> {
  const admin = createAdminClient();

  let { data: request, error } = await admin
    .from("solicitudes_de_servicio")
    .select("id,client_id,category,description,address,status,professional_id,auto_matched_at")
    .eq("id", requestId)
    .maybeSingle();

  if (error && /auto_matched_at/i.test(error.message)) {
    ({ data: request, error } = await admin
      .from("solicitudes_de_servicio")
      .select("id,client_id,category,description,address,status,professional_id")
      .eq("id", requestId)
      .maybeSingle());
  }

  if (error || !request) {
    return { invited: 0, skipped: true, reason: error?.message ?? "Solicitud no encontrada" };
  }

  if (request.status !== "publicada" || request.professional_id) {
    return { invited: 0, skipped: true, reason: "Solicitud no disponible para match" };
  }

  if ("auto_matched_at" in request && request.auto_matched_at) {
    return { invited: 0, skipped: true, reason: "Ya se ejecutó auto-match" };
  }

  const queryText = [request.category, request.description].filter(Boolean).join(" — ");
  const parsed = parseServiceQuery(queryText);

  const { data: pros, error: searchError } = await admin.rpc("search_professionals", {
    p_category: parsed.category || request.category || null,
    p_specialty: parsed.specialty || null,
    p_commune: null,
    p_limit: 8,
  });

  if (searchError) {
    // Fallback: profesionales verificados recientes
    const { data: fallback } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "professional")
      .eq("identity_verified", true)
      .eq("public_profile", true)
      .neq("id", request.client_id)
      .order("updated_at", { ascending: false })
      .limit(8);

    const ids = (fallback ?? []).map((p) => p.id);
    return notifyPros(admin, requestId, request.category, ids);
  }

  const rows = (pros as SearchRow[] | null) ?? [];
  const ids = rows.map((r) => r.id).filter((id) => id && id !== request.client_id);

  return notifyPros(admin, requestId, request.category, ids);
}

async function notifyPros(
  admin: ReturnType<typeof createAdminClient>,
  requestId: string,
  category: string | null,
  professionalIds: string[],
) {
  const unique = [...new Set(professionalIds)].slice(0, 8);
  const now = new Date().toISOString();

  async function markMatched() {
    const { error: markError } = await admin
      .from("solicitudes_de_servicio")
      .update({ auto_matched_at: now })
      .eq("id", requestId);
    if (markError && !/auto_matched_at/i.test(markError.message)) {
      console.error("[auto-match] mark failed", markError.message);
    }
  }

  if (unique.length === 0) {
    await markMatched();
    return { invited: 0, skipped: false, reason: "Sin profesionales coincidentes" };
  }

  const rows = unique.map((userId) => ({
    user_id: userId,
    request_id: requestId,
    title: "Nuevo trabajo para ti",
    body: `Hay una solicitud de ${category || "servicio"} que coincide con tu perfil. Revisa y postula ahora.`,
  }));

  await admin.from("notifications").insert(rows);
  await markMatched();

  // Aviso al cliente: ya estamos buscando
  const { data: request } = await admin
    .from("solicitudes_de_servicio")
    .select("client_id")
    .eq("id", requestId)
    .maybeSingle();

  if (request?.client_id) {
    await admin.from("notifications").insert({
      user_id: request.client_id,
      request_id: requestId,
      title: "Profesionales notificados",
      body: `Avisamos a ${unique.length} profesionales verificados. Pronto verás propuestas.`,
    });
  }

  return { invited: unique.length, skipped: false };
}

export async function processUnmatchedPublishedRequests(limit = 10) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("solicitudes_de_servicio")
    .select("id")
    .eq("status", "publicada")
    .is("professional_id", null)
    .is("auto_matched_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    // Columna aún no migrada
    if (/auto_matched_at/i.test(error.message)) {
      return { processed: 0, invited: 0, error: "MIGRATION_REQUIRED" };
    }
    throw new Error(error.message);
  }

  let invited = 0;
  for (const row of data ?? []) {
    const result = await inviteProfessionalsForRequest(row.id);
    invited += result.invited;
  }

  return { processed: (data ?? []).length, invited };
}
