import type { EcosystemAutomationDecision } from "@/lib/ecosystem/automation";
import type { EvaluationAuditDecision } from "@/lib/evaluations/audit";
import type { RenewalDecision } from "@/lib/operational/renewal";
import type { OperationalDecision } from "@/lib/operational/status";

export type ReviewQueueItemType =
  | "document_renewal"
  | "manual_document_review"
  | "account_suspension"
  | "technical_evaluation"
  | "second_review"
  | "sensitive_automation";

export type ReviewQueuePriority = "low" | "medium" | "high" | "critical";

export type ReviewQueueItem = {
  id: string;
  type: ReviewQueueItemType;
  priority: ReviewQueuePriority;
  title: string;
  summary: string;
  requiresHumanAction: boolean;
  dueAt: string | null;
};

export type ReviewQueueDecision = {
  items: ReviewQueueItem[];
  highestPriority: ReviewQueuePriority | null;
  requiresHumanAction: boolean;
  summary: string;
};

const PRIORITY_SCORE: Record<ReviewQueuePriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function buildOperationalReviewQueue(input: {
  profileId: string;
  operational: OperationalDecision;
  renewal: RenewalDecision;
  evaluationAudit: EvaluationAuditDecision;
  automation: EcosystemAutomationDecision;
}): ReviewQueueDecision {
  const items: ReviewQueueItem[] = [];

  if (input.renewal.shouldSuspend) {
    items.push({
      id: `${input.profileId}:account-suspension`,
      type: "account_suspension",
      priority: "critical",
      title: "Suspension documental",
      summary: input.renewal.summary,
      requiresHumanAction: input.renewal.requiresManualReview,
      dueAt: input.renewal.deadlineAt,
    });
  } else if (input.renewal.requiresManualReview) {
    items.push({
      id: `${input.profileId}:manual-document-review`,
      type: "manual_document_review",
      priority: "high",
      title: "Revision documental",
      summary: input.renewal.summary,
      requiresHumanAction: true,
      dueAt: input.renewal.deadlineAt,
    });
  } else if (input.renewal.actions.includes("send_reminder")) {
    items.push({
      id: `${input.profileId}:document-renewal`,
      type: "document_renewal",
      priority: input.renewal.status === "due_soon" ? "medium" : "low",
      title: "Renovacion semestral",
      summary: input.renewal.summary,
      requiresHumanAction: false,
      dueAt: input.renewal.deadlineAt,
    });
  }

  if (input.evaluationAudit.actions.includes("request_evaluator")) {
    items.push({
      id: `${input.profileId}:technical-evaluation`,
      type: "technical_evaluation",
      priority: "medium",
      title: "Asignar evaluador",
      summary: input.evaluationAudit.summary,
      requiresHumanAction: true,
      dueAt: null,
    });
  }

  if (input.evaluationAudit.actions.includes("second_review")) {
    items.push({
      id: `${input.profileId}:second-review`,
      type: "second_review",
      priority: "high",
      title: "Segunda revision tecnica",
      summary: input.evaluationAudit.summary,
      requiresHumanAction: true,
      dueAt: null,
    });
  }

  if (input.automation.requiresHumanApproval) {
    items.push({
      id: `${input.profileId}:sensitive-automation`,
      type: "sensitive_automation",
      priority: input.operational.canAcceptWork ? "medium" : "high",
      title: "Automatizacion sensible",
      summary: input.automation.summary,
      requiresHumanAction: true,
      dueAt: null,
    });
  }

  const sortedItems = items.sort((left, right) => {
    const priorityDiff = PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (left.dueAt ?? "9999-12-31").localeCompare(right.dueAt ?? "9999-12-31");
  });

  const highestPriority = sortedItems[0]?.priority ?? null;

  return {
    items: sortedItems,
    highestPriority,
    requiresHumanAction: sortedItems.some((item) => item.requiresHumanAction),
    summary: summaryFromItems(sortedItems),
  };
}

function summaryFromItems(items: ReviewQueueItem[]): string {
  if (!items.length) {
    return "No hay revisiones operativas pendientes.";
  }

  const criticalCount = items.filter((item) => item.priority === "critical").length;
  if (criticalCount > 0) {
    return `${criticalCount} alerta critica requiere atencion operativa.`;
  }

  const humanCount = items.filter((item) => item.requiresHumanAction).length;
  if (humanCount > 0) {
    return `${humanCount} revision requiere accion humana.`;
  }

  return `${items.length} seguimiento automatico pendiente.`;
}
