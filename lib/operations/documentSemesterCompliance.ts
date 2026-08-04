import type {
  OperationalDocumentKind,
  OperationalDocumentStatus,
} from "@/lib/operations/documentRenewalPersistence";
import { getSemesterPeriod, type SemesterPeriod } from "@/lib/operational/status";

export type DocumentSemesterComplianceStatus =
  | "complete"
  | "open"
  | "due_soon"
  | "pending_review"
  | "suspension_ready";

export type DocumentSemesterComplianceReason =
  | "all_required_documents_approved"
  | "required_documents_missing"
  | "required_documents_due_soon"
  | "documents_pending_review"
  | "documents_rejected"
  | "documents_expired"
  | "deadline_passed";

export type SemesterDocumentEvidence = {
  documentId: string;
  documentKind: OperationalDocumentKind;
  status: OperationalDocumentStatus;
  semesterYear: number;
  semester: "S1" | "S2";
  submittedAt?: string | null;
  updatedAt?: string | null;
};

export type DocumentSemesterCompliance = {
  status: DocumentSemesterComplianceStatus;
  period: ComplianceSemesterPeriod;
  requiredKinds: OperationalDocumentKind[];
  approvedKinds: OperationalDocumentKind[];
  missingKinds: OperationalDocumentKind[];
  pendingKinds: OperationalDocumentKind[];
  rejectedKinds: OperationalDocumentKind[];
  expiredKinds: OperationalDocumentKind[];
  deadlineAt: string;
  daysUntilDeadline: number;
  shouldSuspend: boolean;
  requiresManualReview: boolean;
  reasons: DocumentSemesterComplianceReason[];
  summary: string;
};

type ComplianceSemesterPeriod = SemesterPeriod & {
  code: "S1" | "S2";
  startsAt: string;
  endsAt: string;
};

export function evaluateDocumentSemesterCompliance(input: {
  documents: SemesterDocumentEvidence[];
  requiredKinds: OperationalDocumentKind[];
  now?: Date;
  reminderDaysBeforeDeadline?: number;
}): DocumentSemesterCompliance {
  const now = input.now ?? new Date();
  const reminderDays = input.reminderDaysBeforeDeadline ?? 21;
  const period = getCompliancePeriod(now);
  const documents = input.documents.filter(
    (document) =>
      document.semesterYear === period.year && document.semester === period.code,
  );
  const requiredKinds = uniqueKinds(input.requiredKinds);
  const approvedKinds: OperationalDocumentKind[] = [];
  const missingKinds: OperationalDocumentKind[] = [];
  const pendingKinds: OperationalDocumentKind[] = [];
  const rejectedKinds: OperationalDocumentKind[] = [];
  const expiredKinds: OperationalDocumentKind[] = [];

  for (const kind of requiredKinds) {
    const state = stateForKind(documents, kind);
    if (state === "approved") approvedKinds.push(kind);
    if (state === "missing") missingKinds.push(kind);
    if (state === "pending") pendingKinds.push(kind);
    if (state === "rejected") rejectedKinds.push(kind);
    if (state === "expired") expiredKinds.push(kind);
  }

  const deadlineAt = period.endsAt;
  const daysUntilDeadline = diffDays(now, new Date(`${deadlineAt}T23:59:59`));
  const reasons = buildReasons({
    approvedKinds,
    missingKinds,
    pendingKinds,
    rejectedKinds,
    expiredKinds,
    requiredKinds,
    daysUntilDeadline,
    reminderDays,
  });
  const shouldSuspend =
    rejectedKinds.length > 0 ||
    expiredKinds.length > 0 ||
    (daysUntilDeadline < 0 && missingKinds.length > 0);
  const requiresManualReview =
    pendingKinds.length > 0 || rejectedKinds.length > 0 || expiredKinds.length > 0;
  const status = statusFromCompliance({
    approvedKinds,
    requiredKinds,
    pendingKinds,
    shouldSuspend,
    daysUntilDeadline,
    reminderDays,
  });

  return {
    status,
    period,
    requiredKinds,
    approvedKinds,
    missingKinds,
    pendingKinds,
    rejectedKinds,
    expiredKinds,
    deadlineAt,
    daysUntilDeadline,
    shouldSuspend,
    requiresManualReview,
    reasons,
    summary: summaryFromCompliance(status),
  };
}

export function resolveDocumentCompliancePeriod(now = new Date()): ComplianceSemesterPeriod {
  return getCompliancePeriod(now);
}

type KindState = "approved" | "pending" | "rejected" | "expired" | "missing";

function stateForKind(
  documents: SemesterDocumentEvidence[],
  kind: OperationalDocumentKind,
): KindState {
  const matching = documents.filter((document) => document.documentKind === kind);
  if (!matching.length) return "missing";
  if (matching.some((document) => document.status === "approved")) return "approved";
  if (matching.some((document) => document.status === "rejected")) return "rejected";
  if (matching.some((document) => document.status === "expired")) return "expired";
  if (
    matching.some((document) =>
      ["submitted", "ocr_pending", "ocr_completed", "needs_manual_review"].includes(
        document.status,
      ),
    )
  ) {
    return "pending";
  }

  return "missing";
}

function getCompliancePeriod(date: Date): ComplianceSemesterPeriod {
  const active = getSemesterPeriod(date);
  if (active.code === "S1" || active.code === "S2") {
    return active as ComplianceSemesterPeriod;
  }

  return {
    year: date.getFullYear() - 1,
    code: "S2",
    startsAt: `${date.getFullYear() - 1}-08-01`,
    endsAt: `${date.getFullYear() - 1}-12-31`,
  };
}

function uniqueKinds(kinds: OperationalDocumentKind[]): OperationalDocumentKind[] {
  return [...new Set(kinds)];
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / 86_400_000);
}

function buildReasons(input: {
  approvedKinds: OperationalDocumentKind[];
  missingKinds: OperationalDocumentKind[];
  pendingKinds: OperationalDocumentKind[];
  rejectedKinds: OperationalDocumentKind[];
  expiredKinds: OperationalDocumentKind[];
  requiredKinds: OperationalDocumentKind[];
  daysUntilDeadline: number;
  reminderDays: number;
}): DocumentSemesterComplianceReason[] {
  const reasons: DocumentSemesterComplianceReason[] = [];

  if (input.approvedKinds.length === input.requiredKinds.length) {
    reasons.push("all_required_documents_approved");
  }
  if (input.missingKinds.length > 0) reasons.push("required_documents_missing");
  if (input.pendingKinds.length > 0) reasons.push("documents_pending_review");
  if (input.rejectedKinds.length > 0) reasons.push("documents_rejected");
  if (input.expiredKinds.length > 0) reasons.push("documents_expired");
  if (input.daysUntilDeadline < 0) reasons.push("deadline_passed");
  if (
    input.daysUntilDeadline >= 0 &&
    input.daysUntilDeadline <= input.reminderDays &&
    input.missingKinds.length > 0
  ) {
    reasons.push("required_documents_due_soon");
  }

  return reasons;
}

function statusFromCompliance(input: {
  approvedKinds: OperationalDocumentKind[];
  requiredKinds: OperationalDocumentKind[];
  pendingKinds: OperationalDocumentKind[];
  shouldSuspend: boolean;
  daysUntilDeadline: number;
  reminderDays: number;
}): DocumentSemesterComplianceStatus {
  if (input.shouldSuspend) return "suspension_ready";
  if (input.pendingKinds.length > 0) return "pending_review";
  if (input.approvedKinds.length === input.requiredKinds.length) return "complete";
  if (input.daysUntilDeadline <= input.reminderDays) return "due_soon";
  return "open";
}

function summaryFromCompliance(status: DocumentSemesterComplianceStatus): string {
  if (status === "complete") return "Documentacion semestral completa.";
  if (status === "pending_review") return "Documentacion ingresada pendiente de revision.";
  if (status === "suspension_ready") return "Cuenta lista para suspension documental.";
  if (status === "due_soon") return "Plazo documental semestral proximo a vencer.";
  return "Documentacion semestral pendiente dentro del plazo.";
}
