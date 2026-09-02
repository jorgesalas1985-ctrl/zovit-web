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
  const { data: claimData, error: claimError } = await admin.rpc("intranet_claim_request_auto_match", {
    p_request_id: requestId,
  });
  if (claimError) return { invited: 0, skipped: true, reason: claimError.message };
  const claim = (claimData as Array<{ claim_token: string; client_id: string; category: string | null; description: string | null }> | null)?.[0];
  if (!claim) return { invited: 0, skipped: true, reason: "Solicitud no disponible o en procesamiento" };

  const queryText = [claim.category, claim.description].filter(Boolean).join(" — ");
  const parsed = parseServiceQuery(queryText);

  const { data: pros, error: searchError } = await admin.rpc("search_professionals", {
    p_category: parsed.category || claim.category || null,
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
      .neq("id", claim.client_id)
      .order("updated_at", { ascending: false })
      .limit(8);

    const ids = (fallback ?? []).map((p) => p.id);
    return completeAutoMatch(admin, requestId, claim.claim_token, ids);
  }

  const rows = (pros as SearchRow[] | null) ?? [];
  const ids = rows.map((r) => r.id).filter((id) => id && id !== claim.client_id);
  return completeAutoMatch(admin, requestId, claim.claim_token, ids);
}

async function completeAutoMatch(
  admin: ReturnType<typeof createAdminClient>,
  requestId: string,
  claimToken: string,
  professionalIds: string[],
) {
  const unique = [...new Set(professionalIds)].slice(0, 8);
  const { data, error } = await admin.rpc("intranet_complete_request_auto_match", {
    p_request_id: requestId, p_claim_token: claimToken, p_professional_ids: unique,
  });
  if (error) return { invited: 0, skipped: true, reason: error.message };
  return { invited: Number(data ?? 0), skipped: false, reason: unique.length === 0 ? "Sin profesionales coincidentes" : undefined };
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
