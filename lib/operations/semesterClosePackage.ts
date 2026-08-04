import type { SemesterCode } from "@/lib/operational/status";
import {
  buildOperationalSemesterSummary,
  type OperationalSemesterSummary,
} from "@/lib/operations/operationalSemesterSummary";
import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";
import {
  decideSemesterClose,
  type SemesterCloseDecision,
} from "@/lib/operations/semesterCloseDecision";
import {
  buildSemesterCloseReport,
  type SemesterCloseReport,
} from "@/lib/operations/semesterCloseReport";
import {
  buildSemesterCloseActionItems,
  type SemesterCloseActionItem,
} from "@/lib/operations/semesterCloseActionItems";
import {
  summarizeSemesterCloseActions,
  type SemesterCloseActionSummary,
} from "@/lib/operations/semesterCloseActionSummary";
import {
  decideSemesterCloseExecutionPolicy,
  type SemesterCloseExecutionPolicy,
} from "@/lib/operations/semesterCloseExecutionPolicy";
import {
  buildSemesterCloseAuditTrail,
  type SemesterCloseAuditTrail,
} from "@/lib/operations/semesterCloseAuditTrail";

export type SemesterClosePackage = {
  summary: OperationalSemesterSummary;
  decision: SemesterCloseDecision;
  report: SemesterCloseReport;
  actionItems: SemesterCloseActionItem[];
  actionSummary: SemesterCloseActionSummary;
  executionPolicy: SemesterCloseExecutionPolicy;
  auditTrail: SemesterCloseAuditTrail;
};

export function buildSemesterClosePackage(input: {
  manifests: OperationalSnapshotManifest[];
  year: number;
  semester: Exclude<SemesterCode, "OUT_OF_SEMESTER">;
}): SemesterClosePackage {
  const summary = buildOperationalSemesterSummary({
    manifests: input.manifests,
    year: input.year,
    semester: input.semester,
  });
  const decision = decideSemesterClose(summary);
  const report = buildSemesterCloseReport({ summary, decision });
  const actionItems = buildSemesterCloseActionItems({ summary, decision });
  const actionSummary = summarizeSemesterCloseActions(actionItems);
  const executionPolicy = decideSemesterCloseExecutionPolicy(actionItems);
  const auditTrail = buildSemesterCloseAuditTrail({ policy: executionPolicy });

  return {
    summary,
    decision,
    report,
    actionItems,
    actionSummary,
    executionPolicy,
    auditTrail,
  };
}
