import type { SupabaseClient } from "@supabase/supabase-js";
import type { CarnetOcrVerdict } from "@/lib/verification/aiCarnetOcr";

export async function applyIdentityAiVerdict(params: {
  admin: SupabaseClient;
  profileId: string;
  verdict: CarnetOcrVerdict;
}) {
  const { admin, profileId, verdict } = params;
  const now = new Date().toISOString();

  const { data: target } = await admin
    .from("profiles")
    .select("intranet_role")
    .eq("id", profileId)
    .maybeSingle();

  // Nunca rechazar al super administrador (ni por OCR ni por IA).
  const protectedSuperAdmin = target?.intranet_role === "super_admin";
  const effectiveDecision =
    protectedSuperAdmin && verdict.decision === "rejected" ? "dudoso" : verdict.decision;

  const aiStatus =
    effectiveDecision === "approved"
      ? "approved"
      : effectiveDecision === "rejected"
        ? "rejected"
        : "dudoso";

  const baseAiUpdate = {
    identity_ai_status: aiStatus,
    identity_ai_at: now,
    identity_ai_summary: protectedSuperAdmin
      ? `${verdict.summary} (super admin protegido: no se rechaza)`
      : verdict.summary,
    identity_ai_confidence: verdict.confidence,
    identity_ai_forgery_risk: verdict.forgeryRisk,
    identity_ai_extracted_rut: verdict.extractedRut,
    identity_ai_extracted_birth_date: verdict.extractedBirthDate,
    updated_at: now,
  };

  if (effectiveDecision === "approved") {
    const { error } = await admin
      .from("profiles")
      .update({
        ...baseAiUpdate,
        identity_status: "approved",
        identity_verified: true,
        biometric_verified: true,
        identity_verified_at: now,
        identity_rejection_reason: null,
        birth_date_admin_corroborated: true,
        birth_date_admin_corroborated_at: now,
        birth_date_admin_corroborated_by: null,
      })
      .eq("id", profileId)
      .eq("identity_status", "pending");

    if (error) throw error;

    await admin
      .from("identity_documents")
      .update({
        status: "approved",
        reviewed_at: now,
        admin_notes: `IA auto-aprobó: ${verdict.summary}`,
        updated_at: now,
      })
      .eq("profile_id", profileId);

    return { applied: "approved" as const };
  }

  if (effectiveDecision === "rejected") {
    const reason =
      verdict.userMessage ||
      verdict.reasons.join("; ") ||
      "No se pudo validar el carnet automáticamente.";

    const { error } = await admin
      .from("profiles")
      .update({
        ...baseAiUpdate,
        identity_status: "rejected",
        identity_verified: false,
        biometric_verified: false,
        identity_verified_at: null,
        identity_rejection_reason: reason,
        birth_date_admin_corroborated: false,
        birth_date_admin_corroborated_at: null,
        birth_date_admin_corroborated_by: null,
      })
      .eq("id", profileId)
      .eq("identity_status", "pending");

    if (error) throw error;

    await admin
      .from("identity_documents")
      .update({
        status: "rejected",
        reviewed_at: now,
        admin_notes: reason,
        updated_at: now,
      })
      .eq("profile_id", profileId);

    return { applied: "rejected" as const };
  }

  const { error } = await admin
    .from("profiles")
    .update(baseAiUpdate)
    .eq("id", profileId)
    .eq("identity_status", "pending");

  if (error) throw error;
  return { applied: "dudoso" as const };
}
