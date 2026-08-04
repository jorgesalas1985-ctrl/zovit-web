import type {
  OperationalActionMode,
  OperationalActionPlan,
  OperationalActionPlanItem,
} from "@/lib/operations/actionPlan";

export type ExecutionPolicyStatus =
  | "executable"
  | "requires_manual_action"
  | "requires_superadmin_approval"
  | "blocked";

export type ExecutionPolicyReason =
  | "automatic_action_allowed"
  | "manual_action_required"
  | "superadmin_approval_required"
  | "sensitive_action_without_approval"
  | "action_blocked";

export type ExecutionPolicyItem = OperationalActionPlanItem & {
  status: ExecutionPolicyStatus;
  canExecuteNow: boolean;
  reasons: ExecutionPolicyReason[];
};

export type ExecutionPolicyDecision = {
  items: ExecutionPolicyItem[];
  executableCount: number;
  blockedCount: number;
  manualCount: number;
  superadminApprovalCount: number;
  summary: string;
};

export function decideExecutionPolicy(input: {
  plan: OperationalActionPlan;
  superadminApprovedActionIds?: string[];
  blockedActionIds?: string[];
}): ExecutionPolicyDecision {
  const superadminApproved = new Set(input.superadminApprovedActionIds ?? []);
  const blocked = new Set(input.blockedActionIds ?? []);
  const items = input.plan.items.map((item) =>
    decideExecutionPolicyForAction({
      item,
      superadminApproved: superadminApproved.has(item.queueItemId),
      blocked: blocked.has(item.queueItemId),
    }),
  );

  const executableCount = items.filter((item) => item.canExecuteNow).length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const manualCount = items.filter((item) => item.status === "requires_manual_action").length;
  const superadminApprovalCount = items.filter(
    (item) => item.status === "requires_superadmin_approval",
  ).length;

  return {
    items,
    executableCount,
    blockedCount,
    manualCount,
    superadminApprovalCount,
    summary: summaryFromPolicy({
      total: items.length,
      executableCount,
      blockedCount,
      manualCount,
      superadminApprovalCount,
    }),
  };
}

function decideExecutionPolicyForAction(input: {
  item: OperationalActionPlanItem;
  superadminApproved: boolean;
  blocked: boolean;
}): ExecutionPolicyItem {
  if (input.blocked) {
    return buildPolicyItem(input.item, "blocked", false, ["action_blocked"]);
  }

  if (input.item.mode === "automatic") {
    return buildPolicyItem(input.item, "executable", true, ["automatic_action_allowed"]);
  }

  if (input.item.mode === "manual") {
    return buildPolicyItem(input.item, "requires_manual_action", false, [
      "manual_action_required",
    ]);
  }

  if (input.item.mode === "superadmin_approval" && input.superadminApproved) {
    return buildPolicyItem(input.item, "executable", true, ["automatic_action_allowed"]);
  }

  return buildPolicyItem(input.item, "requires_superadmin_approval", false, [
    "superadmin_approval_required",
    "sensitive_action_without_approval",
  ]);
}

function buildPolicyItem(
  item: OperationalActionPlanItem,
  status: ExecutionPolicyStatus,
  canExecuteNow: boolean,
  reasons: ExecutionPolicyReason[],
): ExecutionPolicyItem {
  return {
    ...item,
    status,
    canExecuteNow,
    reasons,
  };
}

function summaryFromPolicy(input: {
  total: number;
  executableCount: number;
  blockedCount: number;
  manualCount: number;
  superadminApprovalCount: number;
}): string {
  if (input.total === 0) {
    return "No hay acciones para ejecutar.";
  }

  if (input.blockedCount > 0) {
    return `${input.blockedCount} accion esta bloqueada por politica operativa.`;
  }

  if (input.superadminApprovalCount > 0) {
    return `${input.superadminApprovalCount} accion espera aprobacion SUPERADMIN.`;
  }

  if (input.manualCount > 0) {
    return `${input.manualCount} accion espera trabajo humano.`;
  }

  return `${input.executableCount} accion puede ejecutarse ahora con auditoria.`;
}

export function executionModeLabel(mode: OperationalActionMode): string {
  if (mode === "automatic") return "Automatica";
  if (mode === "manual") return "Manual";
  return "SUPERADMIN";
}
