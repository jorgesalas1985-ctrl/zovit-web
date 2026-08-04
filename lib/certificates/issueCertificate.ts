import { createAdminClient } from "@/lib/supabase/admin";
import {
  canIssueExperienceCertificate,
  resolveCertificateTitle,
} from "@/lib/certificates/eligibility";
import { generateCertificateFolio, maskChileanRut } from "@/lib/certificates/folio";
import {
  certificateBillingForPrice,
  getCertificatePriceClp,
} from "@/lib/certificates/pricing";
import type { CertificateSnapshot, IssuedCertificate } from "@/lib/certificates/types";

export async function issueExperienceCertificate(profileId: string): Promise<{
  certificate: IssuedCertificate;
  reused: boolean;
  paymentRequired: boolean;
}> {
  const admin = createAdminClient();
  const priceClp = getCertificatePriceClp();
  const billing = certificateBillingForPrice(priceClp);

  // Si ya hay uno activo y es gratis, devolver el vigente (no spamear folios).
  // Si el usuario quiere actualizar snapshot, puede forzar reemisión vía replace=true en API.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id,first_name,last_name,rut,role,can_act_as_professional,identity_verified,biometric_verified,study_verified,experience_level",
    )
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Perfil no encontrado.");
  }

  const [{ count: jobCount }, { data: experienceRows }, { data: ratingRows }] =
    await Promise.all([
      admin
        .from("professional_experience")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", profileId),
      admin
        .from("professional_experience")
        .select("category,hours_worked")
        .eq("professional_id", profileId)
        .order("completed_at", { ascending: false })
        .limit(50),
      admin
        .from("service_ratings")
        .select("rating")
        .eq("professional_id", profileId),
    ]);

  const completedJobs = jobCount ?? 0;
  const eligibility = canIssueExperienceCertificate({
    role: profile.role,
    canActAsProfessional: profile.can_act_as_professional,
    identityVerified: Boolean(profile.identity_verified),
    biometricVerified: Boolean(profile.biometric_verified),
    experienceLevel: profile.experience_level,
    completedJobs,
  });

  if (!eligibility.ok) {
    throw new Error(eligibility.reason ?? "No puedes emitir el certificado aún.");
  }

  if (billing === "pending") {
    throw new Error(
      "La emisión pagada aún no está habilitada en el checkout. Mientras tanto deja ZOVIT_CERTIFICATE_PRICE_CLP=0.",
    );
  }

  const { data: existing } = await admin
    .from("issued_certificates")
    .select("*")
    .eq("profile_id", profileId)
    .eq("certificate_type", "experiencia_profesional")
    .eq("status", "active")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && priceClp <= 0) {
    return {
      certificate: existing as IssuedCertificate,
      reused: true,
      paymentRequired: false,
    };
  }

  const totalHours = (experienceRows ?? []).reduce(
    (sum, row) => sum + Number(row.hours_worked || 0),
    0,
  );
  const ratings = (ratingRows ?? []).map((r) => Number(r.rating)).filter((n) => n > 0);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const categoryCount = new Map<string, number>();
  for (const row of experienceRows ?? []) {
    const key = String(row.category || "General");
    categoryCount.set(key, (categoryCount.get(key) ?? 0) + 1);
  }
  const topCategories = [...categoryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const snapshot: CertificateSnapshot = {
    experienceLevel: profile.experience_level ?? "junior",
    completedJobs,
    totalHours: Math.round(totalHours * 10) / 10,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingCount: ratings.length,
    identityVerified: Boolean(profile.identity_verified),
    biometricVerified: Boolean(profile.biometric_verified),
    studyVerified: Boolean(profile.study_verified),
    topCategories,
    issuedBy: "ZOVIT",
    schemaVersion: 1,
  };

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    "Profesional ZOVIT";
  const title = resolveCertificateTitle(profile.experience_level, completedJobs);

  let folio = generateCertificateFolio();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: clash } = await admin
      .from("issued_certificates")
      .select("id")
      .eq("folio", folio)
      .maybeSingle();
    if (!clash) break;
    folio = generateCertificateFolio();
  }

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await admin
    .from("issued_certificates")
    .insert({
      folio,
      profile_id: profileId,
      certificate_type: "experiencia_profesional",
      title,
      holder_full_name: fullName.toUpperCase(),
      holder_rut_masked: maskChileanRut(profile.rut),
      status: "active",
      issued_at: now,
      snapshot,
      price_clp: priceClp,
      billing_status: billing,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "No se pudo emitir el certificado.");
  }

  if (existing) {
    await admin
      .from("issued_certificates")
      .update({
        status: "replaced",
        revoked_at: now,
        revoke_reason: "Reemplazado por una nueva emisión.",
        replaced_by: created.id,
        updated_at: now,
      })
      .eq("id", existing.id);
  }

  return {
    certificate: created as IssuedCertificate,
    reused: false,
    paymentRequired: false,
  };
}

export async function reissueExperienceCertificate(profileId: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("issued_certificates")
    .update({
      status: "revoked",
      revoked_at: now,
      revoke_reason: "Revocado para reemitir con datos actualizados.",
      updated_at: now,
    })
    .eq("profile_id", profileId)
    .eq("certificate_type", "experiencia_profesional")
    .eq("status", "active");

  return issueExperienceCertificate(profileId);
}
