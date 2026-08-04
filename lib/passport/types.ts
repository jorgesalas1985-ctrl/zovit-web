import type { EcosystemRole } from "@/lib/ecosystem/roles";
import type { OperationalDecision } from "@/lib/operational/status";
import type { RenewalDecision } from "@/lib/operational/renewal";
import type { ReviewQueueDecision } from "@/lib/operations/reviewQueue";
import type { MasterCompetency } from "@/lib/competencies/types";
import type { CertificationEligibilityDecision } from "@/lib/certifications/types";
import type { EcosystemAutomationDecision } from "@/lib/ecosystem/automation";
import type { TechnicalEvaluationDecision } from "@/lib/evaluations/types";
import type { EvaluationAssignmentReadinessDecision } from "@/lib/evaluations/assignments";
import type { EvaluationAuditDecision } from "@/lib/evaluations/audit";
import type { ResponsibleMatchDecision } from "@/lib/matching/types";

export type PassportSectionStatus = "complete" | "partial" | "pending" | "locked";

export type PassportSection = {
  id: string;
  title: string;
  description: string;
  status: PassportSectionStatus;
  href?: string;
};

export type DigitalPassport = {
  owner: {
    id: string;
    displayName: string;
    email: string | null;
  };
  roles: EcosystemRole[];
  operational: OperationalDecision;
  renewalPreview: RenewalDecision;
  reviewQueuePreview: ReviewQueueDecision;
  sections: PassportSection[];
  competencyCatalogPreview: MasterCompetency[];
  certificationPreview: CertificationEligibilityDecision;
  evaluationPreview: TechnicalEvaluationDecision;
  evaluationAssignmentPreview: EvaluationAssignmentReadinessDecision;
  evaluationAuditPreview: EvaluationAuditDecision;
  automationPreview: EcosystemAutomationDecision;
  matchingPreview: ResponsibleMatchDecision;
};
