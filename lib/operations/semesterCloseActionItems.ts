import type { OperationalSemesterSummary } from "@/lib/operations/operationalSemesterSummary";
import type {
  SemesterCloseDecision,
  SemesterCloseDecisionReason,
} from "@/lib/operations/semesterCloseDecision";

export type SemesterCloseActionPriority = "critical" | "high" | "medium" | "low";
export type SemesterCloseActionOwner = "operations" | "superadmin";

export type SemesterCloseActionType =
  | "generate_snapshot"
  | "review_critical_pulse"
  | "resolve_critical_items"
  | "resolve_blocked_actions"
  | "document_observations"
  | "review_worsened_trend"
  | "request_superadmin_review"
  | "finalize_semester_close";

export type SemesterCloseActionItem = {
  id: string;
  type: SemesterCloseActionType;
  title: string;
  summary: string;
  priority: SemesterCloseActionPriority;
  owner: SemesterCloseActionOwner;
  reason: SemesterCloseDecisionReason;
};

export function buildSemesterCloseActionItems(input: {
  summary: OperationalSemesterSummary;
  decision: SemesterCloseDecision;
}): SemesterCloseActionItem[] {
  const items = input.decision.reasons.flatMap((reason) =>
    actionItemsFromReason(reason, input.summary),
  );

  if (input.decision.requiresSuperadminReview) {
    items.push({
      id: `${input.summary.semester.year}-${input.summary.semester.code}:request-superadmin-review`,
      type: "request_superadmin_review",
      title: "Solicitar revision SUPERADMIN",
      summary: "El cierre contiene riesgos criticos que requieren aprobacion superior.",
      priority: "critical",
      owner: "superadmin",
      reason: "latest_snapshot_critical",
    });
  }

  return dedupeActions(items).sort(compareActions);
}

function actionItemsFromReason(
  reason: SemesterCloseDecisionReason,
  summary: OperationalSemesterSummary,
): SemesterCloseActionItem[] {
  const prefix = `${summary.semester.year}-${summary.semester.code}`;

  if (reason === "no_snapshots") {
    return [
      {
        id: `${prefix}:generate-snapshot`,
        type: "generate_snapshot",
        title: "Generar snapshot operacional",
        summary: "Crear una fotografia operacional para iniciar trazabilidad del semestre.",
        priority: "high",
        owner: "operations",
        reason,
      },
    ];
  }

  if (reason === "latest_snapshot_critical") {
    return [
      {
        id: `${prefix}:review-critical-pulse`,
        type: "review_critical_pulse",
        title: "Revisar pulso critico",
        summary: "Analizar las causas del pulso critico antes de cerrar el semestre.",
        priority: "critical",
        owner: "operations",
        reason,
      },
    ];
  }

  if (reason === "critical_items_open") {
    return [
      {
        id: `${prefix}:resolve-critical-items`,
        type: "resolve_critical_items",
        title: "Resolver pendientes criticos",
        summary: `${summary.latestCriticalItems ?? 0} pendiente critico permanece abierto.`,
        priority: "critical",
        owner: "operations",
        reason,
      },
    ];
  }

  if (reason === "blocked_actions_open") {
    return [
      {
        id: `${prefix}:resolve-blocked-actions`,
        type: "resolve_blocked_actions",
        title: "Desbloquear acciones operativas",
        summary: `${summary.latestBlockedActions ?? 0} accion bloqueada impide el cierre limpio.`,
        priority: "critical",
        owner: "operations",
        reason,
      },
    ];
  }

  if (reason === "critical_events_detected" || reason === "warnings_detected") {
    return [
      {
        id: `${prefix}:document-observations`,
        type: "document_observations",
        title: "Documentar observaciones",
        summary: "Registrar eventos y advertencias antes de cerrar con observaciones.",
        priority: "medium",
        owner: "operations",
        reason,
      },
    ];
  }

  if (reason === "trend_worsened") {
    return [
      {
        id: `${prefix}:review-worsened-trend`,
        type: "review_worsened_trend",
        title: "Revisar deterioro semestral",
        summary: "Analizar por que la tendencia operacional empeoro durante el semestre.",
        priority: "high",
        owner: "operations",
        reason,
      },
    ];
  }

  return [
    {
      id: `${prefix}:finalize-semester-close`,
      type: "finalize_semester_close",
      title: "Formalizar cierre semestral",
      summary: "Registrar el cierre operacional con el reporte ejecutivo disponible.",
      priority: "low",
      owner: "operations",
      reason,
    },
  ];
}

function dedupeActions(items: SemesterCloseActionItem[]): SemesterCloseActionItem[] {
  return [...new Map(items.map((item) => [item.type, item])).values()];
}

function compareActions(left: SemesterCloseActionItem, right: SemesterCloseActionItem): number {
  return priorityWeight(right.priority) - priorityWeight(left.priority);
}

function priorityWeight(priority: SemesterCloseActionPriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}
