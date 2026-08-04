import type { SemesterCloseActionItem } from "@/lib/operations/semesterCloseActionItems";

export type SemesterCloseExecutionStatus =
  | "ready_for_preparation"
  | "requires_manual_action"
  | "requires_superadmin_approval";

export type SemesterCloseExecutionReason =
  | "preparation_action"
  | "manual_resolution_required"
  | "superadmin_review_required";

export type SemesterCloseExecutionItem = SemesterCloseActionItem & {
  status: SemesterCloseExecutionStatus;
  canExecuteAutomatically: false;
  reasons: SemesterCloseExecutionReason[];
};

export type SemesterCloseExecutionPolicy = {
  items: SemesterCloseExecutionItem[];
  preparationCount: number;
  manualCount: number;
  superadminCount: number;
  summary: string;
};

export function decideSemesterCloseExecutionPolicy(
  actions: SemesterCloseActionItem[],
): SemesterCloseExecutionPolicy {
  const items = actions.map(decideExecutionForAction);
  const preparationCount = items.filter(
    (item) => item.status === "ready_for_preparation",
  ).length;
  const manualCount = items.filter(
    (item) => item.status === "requires_manual_action",
  ).length;
  const superadminCount = items.filter(
    (item) => item.status === "requires_superadmin_approval",
  ).length;

  return {
    items,
    preparationCount,
    manualCount,
    superadminCount,
    summary: summaryFromCounts({
      total: items.length,
      preparationCount,
      manualCount,
      superadminCount,
    }),
  };
}

function decideExecutionForAction(
  item: SemesterCloseActionItem,
): SemesterCloseExecutionItem {
  if (item.owner === "superadmin") {
    return buildExecutionItem(item, "requires_superadmin_approval", [
      "superadmin_review_required",
    ]);
  }

  if (item.type === "generate_snapshot" || item.type === "document_observations") {
    return buildExecutionItem(item, "ready_for_preparation", [
      "preparation_action",
    ]);
  }

  return buildExecutionItem(item, "requires_manual_action", [
    "manual_resolution_required",
  ]);
}

function buildExecutionItem(
  item: SemesterCloseActionItem,
  status: SemesterCloseExecutionStatus,
  reasons: SemesterCloseExecutionReason[],
): SemesterCloseExecutionItem {
  return {
    ...item,
    status,
    canExecuteAutomatically: false,
    reasons,
  };
}

function summaryFromCounts(input: {
  total: number;
  preparationCount: number;
  manualCount: number;
  superadminCount: number;
}): string {
  if (input.total === 0) {
    return "No hay acciones de cierre para evaluar.";
  }

  if (input.superadminCount > 0) {
    return `${input.superadminCount} accion de cierre espera aprobacion SUPERADMIN.`;
  }

  if (input.manualCount > 0) {
    return `${input.manualCount} accion de cierre requiere trabajo humano.`;
  }

  return `${input.preparationCount} accion de cierre esta lista para preparacion controlada.`;
}
