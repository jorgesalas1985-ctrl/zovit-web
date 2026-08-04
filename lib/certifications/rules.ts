import { getMasterCompetency } from "@/lib/competencies/catalog";
import type { CertificationEligibilityDecision, CertificationEligibilityInput } from "@/lib/certifications/types";

export function evaluateCertificationEligibility(
  input: CertificationEligibilityInput,
): CertificationEligibilityDecision {
  const reasons: CertificationEligibilityDecision["reasons"] = [];
  const competency = getMasterCompetency(input.competencyId);

  if (input.blocked) {
    return { eligible: false, reasons: ["blocked"] };
  }

  if (!input.hasVerifiedIdentity) {
    reasons.push("identity_required");
  }

  if (input.hasOnlyAcademicTraining) {
    reasons.push("academic_training_is_not_certification");
  }

  const requiresExternalLicense = Boolean(
    competency?.scopes.includes("requires_external_license"),
  );

  if (requiresExternalLicense && !input.hasExternalLicense && input.evaluationResult !== "approved") {
    reasons.push("external_license_or_evaluation_required");
  }

  if (!requiresExternalLicense && input.evaluationResult !== "approved") {
    reasons.push("evaluation_required");
  }

  if (reasons.length) {
    return { eligible: false, reasons };
  }

  return { eligible: true, reasons: ["eligible"] };
}

export function canIssueZovitCertification(input: CertificationEligibilityInput): boolean {
  return evaluateCertificationEligibility(input).eligible;
}
