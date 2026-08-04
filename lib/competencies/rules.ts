import { getMasterCompetency } from "@/lib/competencies/catalog";
import type {
  CompetencyLevel,
  CompetencyScope,
  UserCompetencyEvidence,
} from "@/lib/competencies/types";

const ZOVIT_CERTIFICATION_LEVELS: CompetencyLevel[] = [
  "zovit_certified",
  "current",
];

const EDUCATION_ONLY_LEVELS: CompetencyLevel[] = [
  "academic_recorded",
  "module_approved",
  "academic_competency",
];

const BLOCKED_LEVELS: CompetencyLevel[] = ["expired", "suspended", "revoked"];

export function isEducationOnlyLevel(level: CompetencyLevel): boolean {
  return EDUCATION_ONLY_LEVELS.includes(level);
}

export function isZovitCertifiedLevel(level: CompetencyLevel): boolean {
  return ZOVIT_CERTIFICATION_LEVELS.includes(level);
}

export function isBlockedCompetencyLevel(level: CompetencyLevel): boolean {
  return BLOCKED_LEVELS.includes(level);
}

export function competencyHasScope(
  evidence: UserCompetencyEvidence,
  scope: CompetencyScope,
): boolean {
  const competency = getMasterCompetency(evidence.competencyId);
  return Boolean(competency?.scopes.includes(scope));
}

export function canUseCompetencyAutonomously(evidence: UserCompetencyEvidence): boolean {
  if (!evidence.verified) return false;
  if (isBlockedCompetencyLevel(evidence.level)) return false;
  if (!isZovitCertifiedLevel(evidence.level) && evidence.source !== "external_license") return false;
  if (!competencyHasScope(evidence, "autonomous_work")) return false;
  if (competencyHasScope(evidence, "not_for_final_clients")) return false;
  return true;
}

export function requiresSupervisionForCompetency(evidence: UserCompetencyEvidence): boolean {
  if (!evidence.verified) return true;
  if (isEducationOnlyLevel(evidence.level)) return true;
  return competencyHasScope(evidence, "supervised_work") && !canUseCompetencyAutonomously(evidence);
}
