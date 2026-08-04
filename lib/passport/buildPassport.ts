import { ecosystemRolesFromProfile, type EcosystemProfileInput } from "@/lib/ecosystem/roles";
import { MASTER_COMPETENCIES } from "@/lib/competencies/catalog";
import { evaluateCertificationEligibility } from "@/lib/certifications/rules";
import { decideEcosystemAutomation } from "@/lib/ecosystem/automation";
import { auditEvaluationForCertification } from "@/lib/evaluations/audit";
import { decideEvaluationAssignmentReadiness } from "@/lib/evaluations/assignments";
import { decideTechnicalEvaluation } from "@/lib/evaluations/rules";
import { decideResponsibleMatch } from "@/lib/matching/responsibleMatching";
import { decideSemesterRenewal } from "@/lib/operational/renewal";
import { buildOperationalReviewQueue } from "@/lib/operations/reviewQueue";
import { evaluateWorkerOperationalStatus } from "@/lib/operational/worker";
import type { DocumentValidationStatus } from "@/lib/operational/status";
import type { DigitalPassport, PassportSection } from "@/lib/passport/types";

export type PassportProfileInput = EcosystemProfileInput & {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  identity_status?: "none" | "pending" | "approved" | "rejected" | null;
  identity_verified?: boolean | null;
  biometric_verified?: boolean | null;
  study_verified?: boolean | null;
  study_verification_status?: "none" | "pending" | "approved" | "rejected" | null;
};

function displayName(profile: PassportProfileInput): string {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return fullName || profile.email?.split("@")[0] || "Usuario ZOVIT";
}

function statusFromBoolean(done: boolean, pending = false): PassportSection["status"] {
  if (done) return "complete";
  if (pending) return "partial";
  return "pending";
}

function documentStatusFromRegistration(
  status: string | null | undefined,
): DocumentValidationStatus {
  if (status === "verified" || status === "partially_verified") return "verified";
  if (status === "submitted" || status === "needs_info") return "pending";
  if (status === "rejected") return "rejected";
  if (status === "document_expired") return "expired";
  return "missing";
}

export function buildDigitalPassport(profile: PassportProfileInput): DigitalPassport {
  const roles = ecosystemRolesFromProfile(profile);
  const operational = evaluateWorkerOperationalStatus({
    workerStatus: profile.worker_registration_status,
    primaryProfile: profile.primary_service_profile,
    identityStatus: profile.identity_status,
    identityVerified: profile.identity_verified,
    biometricVerified: profile.biometric_verified,
  });
  const renewalPreview = decideSemesterRenewal({
    documentStatus: documentStatusFromRegistration(profile.worker_registration_status),
  });

  const hasProfessionalRole = roles.includes("professional");
  const hasStudentRole = roles.includes("student");
  const certificationPreview = evaluateCertificationEligibility({
    competencyId: "digital-basic-support",
    evaluationResult: "not_started",
    hasVerifiedIdentity: Boolean(profile.identity_verified && profile.biometric_verified),
    hasOnlyAcademicTraining: Boolean(profile.study_verified),
  });
  const evaluationPreview = decideTechnicalEvaluation({
    competencyId: "digital-basic-support",
    score: null,
    evidence: [],
    approvedScopes: [],
  });
  const evaluationAssignmentPreview = decideEvaluationAssignmentReadiness({
    targetOperational: operational,
    evaluatorDecision: null,
    evidenceCount: 0,
  });
  const evaluationAuditPreview = auditEvaluationForCertification({
    assignment: evaluationAssignmentPreview,
    evaluation: evaluationPreview,
  });
  const automationPreview = decideEcosystemAutomation({
    operational,
    certification: certificationPreview,
    evaluation: evaluationPreview,
  });
  const reviewQueuePreview = buildOperationalReviewQueue({
    profileId: profile.id,
    operational,
    renewal: renewalPreview,
    evaluationAudit: evaluationAuditPreview,
    automation: automationPreview,
  });
  const matchingPreview = decideResponsibleMatch(
    {
      serviceId: "passport-preview-low-risk",
      requiredCompetencyIds: ["digital-basic-support"],
      riskLevel: "low",
      requiresCertification: false,
      allowsSupervisedWork: true,
    },
    {
      profileId: profile.id,
      displayName: displayName(profile),
      distanceKm: null,
      rating: null,
      completedJobs: 0,
      competencyIds: hasProfessionalRole ? ["digital-basic-support"] : [],
      certificationIds: [],
      scopes: ["low_risk"],
      operational,
      automation: automationPreview,
    },
  );

  const sections: PassportSection[] = [
    {
      id: "identity",
      title: "Identidad",
      description: "Documento, biometria y estado de verificacion.",
      status: statusFromBoolean(Boolean(profile.identity_verified && profile.biometric_verified), profile.identity_status === "pending"),
      href: "/registro/biometria",
    },
    {
      id: "education",
      title: "Formacion",
      description: "Estudios, alumno regular y antecedentes academicos.",
      status: statusFromBoolean(Boolean(profile.study_verified), profile.study_verification_status === "pending"),
      href: "/verificacion",
    },
    {
      id: "competencies",
      title: "Competencias",
      description: "Competencias academicas y tecnicas asociadas al perfil.",
      status: hasStudentRole || hasProfessionalRole ? "partial" : "locked",
    },
    {
      id: "certifications",
      title: "Certificaciones ZOVIT",
      description: "Certificaciones tecnicas ZOVIT emitidas tras evaluacion.",
      status: "pending",
      href: hasProfessionalRole ? "/verificacion" : undefined,
    },
    {
      id: "experience",
      title: "Experiencia",
      description: "Trabajos, evidencias y reputacion verificable.",
      status: hasProfessionalRole ? "partial" : "locked",
      href: hasProfessionalRole ? "/experiencia" : undefined,
    },
    {
      id: "operational",
      title: "Estado operativo",
      description: "Habilitacion, supervision, documentos y restricciones.",
      status: operational.canAcceptWork ? "complete" : operational.requiresManualReview ? "partial" : "pending",
    },
  ];

  return {
    owner: {
      id: profile.id,
      displayName: displayName(profile),
      email: profile.email ?? null,
    },
    roles,
    operational,
    renewalPreview,
    reviewQueuePreview,
    sections,
    competencyCatalogPreview: MASTER_COMPETENCIES.filter((competency) => competency.status === "active"),
    certificationPreview,
    evaluationPreview,
    evaluationAssignmentPreview,
    evaluationAuditPreview,
    automationPreview,
    matchingPreview,
  };
}
