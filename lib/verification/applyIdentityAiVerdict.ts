import type { SupabaseClient } from "@supabase/supabase-js";
import type { CarnetOcrVerdict } from "@/lib/verification/aiCarnetOcr";

export type IdentityAiVerdictActor =
  | { kind: "human"; supabase: SupabaseClient }
  | { kind: "automation"; supabase: SupabaseClient; automationSecret: string };

export async function applyIdentityAiVerdict(params: { actor: IdentityAiVerdictActor; profileId: string; verdict: CarnetOcrVerdict }) {
  const { actor, profileId, verdict } = params;
  const common = {
    p_profile_id: profileId, p_decision: verdict.decision, p_summary: verdict.summary,
    p_confidence: verdict.confidence, p_forgery_risk: verdict.forgeryRisk,
    p_extracted_rut: verdict.extractedRut, p_extracted_birth_date: verdict.extractedBirthDate,
    p_rejection_reason: verdict.userMessage || verdict.reasons.join("; ") || "No se pudo validar el carnet automáticamente.",
  };
  const { data, error } = actor.kind === "human"
    ? await actor.supabase.rpc("intranet_apply_identity_ai_verdict_human", common)
    : await actor.supabase.rpc("intranet_apply_identity_ai_verdict_automation", { ...common, p_automation_secret: actor.automationSecret });
  if (error) throw error;
  if (data !== "approved" && data !== "rejected" && data !== "dudoso") throw new Error("El veredicto de identidad no devolvió un estado válido.");
  return { applied: data };
}
