import {
  getSemesterPeriod,
  wasRenewedInCurrentSemester,
  type DocumentValidationStatus,
  type SemesterPeriod,
} from "@/lib/operational/status";

export type RenewalWindowStatus =
  | "out_of_semester"
  | "not_started"
  | "open"
  | "due_soon"
  | "overdue"
  | "submitted"
  | "complete"
  | "blocked";

export type RenewalAction =
  | "no_action"
  | "open_renewal"
  | "send_reminder"
  | "request_manual_review"
  | "suspend_account";

export type RenewalReason =
  | "outside_operational_semester"
  | "renewal_current"
  | "renewal_missing"
  | "renewal_due_soon"
  | "renewal_overdue"
  | "documents_pending_review"
  | "documents_rejected"
  | "documents_expired"
  | "documents_missing";

export type RenewalDecision = {
  status: RenewalWindowStatus;
  semester: SemesterPeriod;
  deadlineAt: string | null;
  daysUntilDeadline: number | null;
  shouldSuspend: boolean;
  requiresManualReview: boolean;
  actions: RenewalAction[];
  reasons: RenewalReason[];
  summary: string;
};

export type RenewalInput = {
  documentStatus: DocumentValidationStatus;
  lastDocumentRenewalAt?: string | null;
  reminderDaysBeforeDeadline?: number;
  now?: Date;
};

export function decideSemesterRenewal(input: RenewalInput): RenewalDecision {
  const now = input.now ?? new Date();
  const semester = getSemesterPeriod(now);
  const reminderDays = input.reminderDaysBeforeDeadline ?? 21;

  if (!semester.endsAt || !semester.startsAt) {
    return buildDecision({
      status: "out_of_semester",
      semester,
      deadlineAt: null,
      daysUntilDeadline: null,
      shouldSuspend: false,
      requiresManualReview: false,
      actions: ["no_action"],
      reasons: ["outside_operational_semester"],
    });
  }

  const daysUntilDeadline = diffDays(now, new Date(`${semester.endsAt}T23:59:59`));
  const renewedThisSemester = wasRenewedInCurrentSemester(input.lastDocumentRenewalAt, now);

  if (input.documentStatus === "expired") {
    return buildDecision({
      status: "blocked",
      semester,
      deadlineAt: semester.endsAt,
      daysUntilDeadline,
      shouldSuspend: true,
      requiresManualReview: false,
      actions: ["suspend_account"],
      reasons: ["documents_expired"],
    });
  }

  if (input.documentStatus === "rejected") {
    return buildDecision({
      status: "blocked",
      semester,
      deadlineAt: semester.endsAt,
      daysUntilDeadline,
      shouldSuspend: true,
      requiresManualReview: true,
      actions: ["request_manual_review", "suspend_account"],
      reasons: ["documents_rejected"],
    });
  }

  if (input.documentStatus === "pending") {
    return buildDecision({
      status: "submitted",
      semester,
      deadlineAt: semester.endsAt,
      daysUntilDeadline,
      shouldSuspend: false,
      requiresManualReview: true,
      actions: ["request_manual_review"],
      reasons: ["documents_pending_review"],
    });
  }

  if (renewedThisSemester && input.documentStatus === "verified") {
    return buildDecision({
      status: "complete",
      semester,
      deadlineAt: semester.endsAt,
      daysUntilDeadline,
      shouldSuspend: false,
      requiresManualReview: false,
      actions: ["no_action"],
      reasons: ["renewal_current"],
    });
  }

  if (daysUntilDeadline < 0) {
    return buildDecision({
      status: "overdue",
      semester,
      deadlineAt: semester.endsAt,
      daysUntilDeadline,
      shouldSuspend: true,
      requiresManualReview: false,
      actions: ["suspend_account"],
      reasons: ["renewal_overdue"],
    });
  }

  if (input.documentStatus === "missing") {
    return buildDecision({
      status: "open",
      semester,
      deadlineAt: semester.endsAt,
      daysUntilDeadline,
      shouldSuspend: false,
      requiresManualReview: false,
      actions: ["open_renewal", "send_reminder"],
      reasons: ["documents_missing", "renewal_missing"],
    });
  }

  if (daysUntilDeadline <= reminderDays) {
    return buildDecision({
      status: "due_soon",
      semester,
      deadlineAt: semester.endsAt,
      daysUntilDeadline,
      shouldSuspend: false,
      requiresManualReview: false,
      actions: ["open_renewal", "send_reminder"],
      reasons: ["renewal_due_soon"],
    });
  }

  return buildDecision({
    status: "open",
    semester,
    deadlineAt: semester.endsAt,
    daysUntilDeadline,
    shouldSuspend: false,
    requiresManualReview: false,
    actions: ["open_renewal"],
    reasons: ["renewal_missing"],
  });
}

function buildDecision(input: Omit<RenewalDecision, "summary">): RenewalDecision {
  return {
    ...input,
    summary: summaryFromDecision(input),
  };
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / 86_400_000);
}

function summaryFromDecision(input: Omit<RenewalDecision, "summary">): string {
  if (input.reasons.includes("renewal_current")) {
    return "La renovacion documental del semestre esta completa.";
  }

  if (input.reasons.includes("documents_pending_review")) {
    return "Los documentos fueron ingresados y esperan revision.";
  }

  if (input.reasons.includes("documents_rejected")) {
    return "Los documentos fueron rechazados y la cuenta debe quedar suspendida hasta revision.";
  }

  if (input.reasons.includes("documents_expired")) {
    return "Los documentos estan vencidos y la cuenta debe quedar suspendida.";
  }

  if (input.reasons.includes("renewal_overdue")) {
    return "El plazo semestral vencio sin renovacion documental.";
  }

  if (input.reasons.includes("renewal_due_soon")) {
    return "El plazo semestral esta por vencer y se debe enviar recordatorio.";
  }

  if (input.reasons.includes("outside_operational_semester")) {
    return "No hay una ventana semestral activa para renovacion documental.";
  }

  return "La renovacion documental del semestre esta pendiente.";
}
