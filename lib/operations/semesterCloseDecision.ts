import type { OperationalSemesterSummary } from "@/lib/operations/operationalSemesterSummary";

export type SemesterCloseStatus =
  | "ready"
  | "ready_with_observations"
  | "blocked"
  | "insufficient_data";

export type SemesterCloseDecisionReason =
  | "no_snapshots"
  | "latest_snapshot_critical"
  | "critical_items_open"
  | "blocked_actions_open"
  | "critical_events_detected"
  | "warnings_detected"
  | "trend_worsened"
  | "ready_for_close";

export type SemesterCloseDecision = {
  status: SemesterCloseStatus;
  canClose: boolean;
  requiresSuperadminReview: boolean;
  reasons: SemesterCloseDecisionReason[];
  checklist: SemesterCloseChecklistItem[];
  summary: string;
};

export type SemesterCloseChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
  severity: "neutral" | "warning" | "critical";
};

export function decideSemesterClose(
  summary: OperationalSemesterSummary,
): SemesterCloseDecision {
  const checklist = buildChecklist(summary);
  const reasons = resolveReasons(summary);
  const criticalFailures = checklist.filter(
    (item) => !item.passed && item.severity === "critical",
  ).length;
  const warningFailures = checklist.filter(
    (item) => !item.passed && item.severity === "warning",
  ).length;

  if (summary.totalSnapshots === 0) {
    return decision({
      status: "insufficient_data",
      canClose: false,
      requiresSuperadminReview: false,
      reasons,
      checklist,
    });
  }

  if (criticalFailures > 0) {
    return decision({
      status: "blocked",
      canClose: false,
      requiresSuperadminReview: true,
      reasons,
      checklist,
    });
  }

  if (warningFailures > 0) {
    return decision({
      status: "ready_with_observations",
      canClose: true,
      requiresSuperadminReview: false,
      reasons,
      checklist,
    });
  }

  return decision({
    status: "ready",
    canClose: true,
    requiresSuperadminReview: false,
    reasons,
    checklist,
  });
}

function buildChecklist(
  summary: OperationalSemesterSummary,
): SemesterCloseChecklistItem[] {
  return [
    {
      id: "snapshots_available",
      label: "Existen snapshots del semestre",
      passed: summary.totalSnapshots > 0,
      severity: "critical",
    },
    {
      id: "health_not_critical",
      label: "El ultimo pulso no esta critico",
      passed: summary.latestHealthStatus !== "critical",
      severity: "critical",
    },
    {
      id: "critical_items_closed",
      label: "No hay pendientes criticos abiertos",
      passed: (summary.latestCriticalItems ?? 0) === 0,
      severity: "critical",
    },
    {
      id: "blocked_actions_closed",
      label: "No hay acciones bloqueadas abiertas",
      passed: (summary.latestBlockedActions ?? 0) === 0,
      severity: "critical",
    },
    {
      id: "no_critical_events",
      label: "No se detectaron eventos criticos en el semestre",
      passed: summary.criticalEvents === 0,
      severity: "warning",
    },
    {
      id: "trend_not_worsened",
      label: "La tendencia semestral no empeoro",
      passed: summary.trend !== "worsened",
      severity: "warning",
    },
  ];
}

function resolveReasons(
  summary: OperationalSemesterSummary,
): SemesterCloseDecisionReason[] {
  const reasons: SemesterCloseDecisionReason[] = [];

  if (summary.totalSnapshots === 0) reasons.push("no_snapshots");
  if (summary.latestHealthStatus === "critical") reasons.push("latest_snapshot_critical");
  if ((summary.latestCriticalItems ?? 0) > 0) reasons.push("critical_items_open");
  if ((summary.latestBlockedActions ?? 0) > 0) reasons.push("blocked_actions_open");
  if (summary.criticalEvents > 0) reasons.push("critical_events_detected");
  if (summary.warningEvents > 0) reasons.push("warnings_detected");
  if (summary.trend === "worsened") reasons.push("trend_worsened");
  if (reasons.length === 0) reasons.push("ready_for_close");

  return reasons;
}

function decision(input: {
  status: SemesterCloseStatus;
  canClose: boolean;
  requiresSuperadminReview: boolean;
  reasons: SemesterCloseDecisionReason[];
  checklist: SemesterCloseChecklistItem[];
}): SemesterCloseDecision {
  return {
    ...input,
    summary: summaryFromStatus(input.status),
  };
}

function summaryFromStatus(status: SemesterCloseStatus): string {
  if (status === "insufficient_data") {
    return "No hay informacion suficiente para cerrar el semestre.";
  }

  if (status === "blocked") {
    return "El cierre semestral queda bloqueado hasta resolver riesgos criticos.";
  }

  if (status === "ready_with_observations") {
    return "El semestre puede cerrarse con observaciones documentadas.";
  }

  return "El semestre esta listo para cierre operacional.";
}
