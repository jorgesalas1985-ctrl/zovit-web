import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiWorkerVerdict } from "@/lib/worker/aiDocumentValidation";
import type { ServiceProfileType, WorkerRegistrationStatus } from "@/lib/worker/types";

function badgeForProfile(profile: ServiceProfileType | null | undefined): string {
  if (profile === "community_collaborator") return "community_collaborator";
  if (profile === "in_training") return "in_training";
  if (profile === "experience_verified") return "experience_proven";
  return "certification_verified";
}

export async function applyAiVerdict(params: {
  supabase: SupabaseClient;
  profileId: string;
  actorId: string;
  verdict: AiWorkerVerdict;
  primaryProfile?: ServiceProfileType | null;
}) {
  const { supabase, profileId, actorId, verdict } = params;
  const now = new Date().toISOString();

  const status: WorkerRegistrationStatus =
    verdict.decision === "approved"
      ? "verified"
      : verdict.decision === "rejected"
        ? "rejected"
        : "submitted";

  const aiStatus =
    verdict.decision === "approved"
      ? "approved"
      : verdict.decision === "rejected"
        ? "rejected"
        : "dudoso";

  await supabase
    .from("worker_registrations")
    .update({
      status,
      reviewed_at: verdict.decision === "dudoso" ? null : now,
      reviewed_by: verdict.decision === "dudoso" ? null : actorId,
      review_message: verdict.professionalMessage,
      ai_review_status: aiStatus,
      ai_review_at: now,
      ai_review_summary: verdict.summary,
      ai_confidence: verdict.confidence,
      ai_forgery_risk: verdict.forgeryRisk,
      updated_at: now,
    })
    .eq("profile_id", profileId);

  await supabase
    .from("profiles")
    .update({
      worker_registration_status: status,
      updated_at: now,
    })
    .eq("id", profileId);

  for (const cred of verdict.credentials) {
    if (!cred.credentialId) continue;
    const credStatus =
      cred.decision === "approved"
        ? "verified"
        : cred.decision === "rejected"
          ? "rejected"
          : "pending";
    await supabase
      .from("worker_credentials")
      .update({
        status: credStatus,
        reviewed_by: actorId,
        reviewed_at: now,
        rejection_reason: cred.decision === "rejected" ? cred.reasons.join("; ") : null,
        ai_notes: [...cred.reasons, ...cred.manipulationSignals].join(" | ") || null,
        ai_forgery_risk: cred.forgeryRisk,
        updated_at: now,
      })
      .eq("id", cred.credentialId)
      .eq("profile_id", profileId);
  }

  if (verdict.decision === "approved") {
    if (params.primaryProfile) {
      await supabase
        .from("profiles")
        .update({ primary_service_profile: params.primaryProfile, updated_at: now })
        .eq("id", profileId);
    }

    await supabase.from("worker_public_badges").upsert(
      [
        { profile_id: profileId, badge_key: "background_reviewed", granted_by: actorId },
        {
          profile_id: profileId,
          badge_key: badgeForProfile(params.primaryProfile),
          granted_by: actorId,
        },
      ],
      { onConflict: "profile_id,badge_key" }
    );

    await supabase
      .from("worker_service_authorizations")
      .update({ authorization_status: "authorized", updated_at: now })
      .eq("profile_id", profileId)
      .eq("requires_credential", false);

    const allCredsApproved =
      verdict.credentials.length > 0 &&
      verdict.credentials.every((c) => c.decision === "approved");
    if (allCredsApproved) {
      await supabase
        .from("worker_service_authorizations")
        .update({ authorization_status: "authorized", updated_at: now })
        .eq("profile_id", profileId)
        .eq("requires_credential", true);
    }
  }

  await supabase.from("worker_review_history").insert({
    profile_id: profileId,
    actor_id: actorId,
    action: `ai_${verdict.decision}`,
    details: {
      model: verdict.model,
      confidence: verdict.confidence,
      forgeryRisk: verdict.forgeryRisk,
      summary: verdict.summary,
      professionalMessage: verdict.professionalMessage,
      credentials: verdict.credentials,
      automated: true,
    },
  });

  return { status, aiStatus };
}
