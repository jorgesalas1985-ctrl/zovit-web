import { resolveCertificateTitle } from "@/lib/certificates/eligibility";
import { maskChileanRut } from "@/lib/certificates/folio";
import type { PublicIssuedCertificate } from "@/lib/certificates/types";
import type { ProfessionalStats } from "@/lib/experience/types";
import type { PublicCredentialProfile } from "@/lib/credential/types";
import { createAdminClient } from "@/lib/supabase/admin";

function fullName(profile: PublicCredentialProfile): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Usuario ZOVIT";
}

/** Certificado premium emitido o vista previa verificable (estilo documento oficial). */
export async function loadPremiumCertificate(
  profile: PublicCredentialProfile,
  stats: ProfessionalStats | null,
): Promise<PublicIssuedCertificate> {
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("issued_certificates")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("certificate_type", "experiencia_profesional")
      .eq("status", "active")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        folio: existing.folio,
        certificate_type: existing.certificate_type,
        title: existing.title,
        holder_full_name: existing.holder_full_name,
        holder_rut_masked: existing.holder_rut_masked,
        status: existing.status,
        issued_at: existing.issued_at,
        revoked_at: existing.revoked_at,
        revoke_reason: existing.revoke_reason,
        snapshot: existing.snapshot,
        billing_status: existing.billing_status,
        profile_id: existing.profile_id,
      } as PublicIssuedCertificate;
    }
  } catch {
    // Continuar con vista previa.
  }

  const completedJobs = stats?.completed_jobs ?? 0;
  const title = resolveCertificateTitle(stats?.experience_level ?? profile.experience_level, completedJobs);

  return {
    folio: `ZV-LIVE-${profile.id.slice(0, 8).toUpperCase()}`,
    certificate_type: "experiencia_profesional",
    title,
    holder_full_name: fullName(profile),
    holder_rut_masked: profile.rut ?? maskChileanRut(profile.rut) ?? "******-*",
    status: "active",
    issued_at: new Date().toISOString(),
    revoked_at: null,
    revoke_reason: null,
    snapshot: {
      experienceLevel: stats?.experience_level ?? profile.experience_level ?? "junior",
      completedJobs,
      totalHours: stats?.total_hours ?? 0,
      averageRating: stats?.average_rating ?? 0,
      ratingCount: stats?.rating_count ?? 0,
      identityVerified: profile.identity_verified,
      biometricVerified: profile.biometric_verified,
      studyVerified: profile.study_verified,
      topCategories: [],
      issuedBy: "ZOVIT",
      schemaVersion: 1,
    },
    billing_status: "free",
    profile_id: profile.id,
  };
}
