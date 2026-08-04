import { EXPERIENCE_BADGES, type ExperienceLevel } from "@/lib/experience/types";

export type CertificateEligibilityInput = {
  role: string | null | undefined;
  canActAsProfessional?: boolean | null;
  identityVerified: boolean;
  biometricVerified: boolean;
  experienceLevel?: string | null;
  completedJobs: number;
};

export function canIssueExperienceCertificate(input: CertificateEligibilityInput): {
  ok: boolean;
  reason?: string;
} {
  const isPro =
    input.role === "professional" ||
    input.role === "admin" ||
    Boolean(input.canActAsProfessional);

  if (!isPro) {
    return {
      ok: false,
      reason: "Debes operar como profesional en ZOVIT para emitir este certificado.",
    };
  }

  if (!input.identityVerified || !input.biometricVerified) {
    return {
      ok: false,
      reason: "Primero verifica tu identidad y biometría (carnet + selfie).",
    };
  }

  return { ok: true };
}

export function resolveCertificateTitle(level: string | null | undefined, completedJobs: number): string {
  const normalized = (level as ExperienceLevel) || "junior";
  if (completedJobs <= 0) {
    return "PROFESIONAL CON IDENTIDAD VERIFICADA";
  }
  if (normalized === "expert") {
    return "PROFESIONAL EXPERTO CON EXPERIENCIA VERIFICADA";
  }
  if (normalized === "verified") {
    return "PROFESIONAL CON EXPERIENCIA VERIFICADA";
  }
  return EXPERIENCE_BADGES.junior.label.toUpperCase();
}
