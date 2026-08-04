import type { ReviewQueueItem } from "@/lib/operations/reviewQueue";

export type OperationalActionMode = "automatic" | "manual" | "superadmin_approval";

export type OperationalActionKind =
  | "send_document_reminder"
  | "review_documents"
  | "suspend_for_documents"
  | "assign_evaluator"
  | "perform_second_review"
  | "approve_sensitive_automation";

export type OperationalActionPlanItem = {
  queueItemId: string;
  mode: OperationalActionMode;
  kind: OperationalActionKind;
  title: string;
  summary: string;
};

export type OperationalActionPlan = {
  items: OperationalActionPlanItem[];
  automaticCount: number;
  manualCount: number;
  superadminApprovalCount: number;
  summary: string;
};

export function buildOperationalActionPlan(input: {
  items: ReviewQueueItem[];
}): OperationalActionPlan {
  const items = input.items.map(actionFromQueueItem);
  const automaticCount = items.filter((item) => item.mode === "automatic").length;
  const manualCount = items.filter((item) => item.mode === "manual").length;
  const superadminApprovalCount = items.filter(
    (item) => item.mode === "superadmin_approval",
  ).length;

  return {
    items,
    automaticCount,
    manualCount,
    superadminApprovalCount,
    summary: summaryFromCounts({
      total: items.length,
      automaticCount,
      manualCount,
      superadminApprovalCount,
    }),
  };
}

function actionFromQueueItem(item: ReviewQueueItem): OperationalActionPlanItem {
  switch (item.type) {
    case "document_renewal":
      return {
        queueItemId: item.id,
        mode: "automatic",
        kind: "send_document_reminder",
        title: "Enviar recordatorio",
        summary: "Puede ejecutarse automaticamente con registro de evento.",
      };
    case "manual_document_review":
      return {
        queueItemId: item.id,
        mode: "manual",
        kind: "review_documents",
        title: "Revisar documentos",
        summary: "Requiere revision humana antes de cambiar el estado operativo.",
      };
    case "account_suspension":
      return {
        queueItemId: item.id,
        mode: item.requiresHumanAction ? "manual" : "automatic",
        kind: "suspend_for_documents",
        title: "Aplicar suspension documental",
        summary: item.requiresHumanAction
          ? "Requiere revision humana antes de suspender."
          : "Puede ejecutarse automaticamente por regla documental vencida.",
      };
    case "technical_evaluation":
      return {
        queueItemId: item.id,
        mode: "manual",
        kind: "assign_evaluator",
        title: "Asignar evaluador",
        summary: "Debe seleccionar un evaluador con alcance suficiente.",
      };
    case "second_review":
      return {
        queueItemId: item.id,
        mode: "manual",
        kind: "perform_second_review",
        title: "Realizar segunda revision",
        summary: "Debe validar la decision tecnica antes de certificar.",
      };
    case "sensitive_automation":
      return {
        queueItemId: item.id,
        mode: "superadmin_approval",
        kind: "approve_sensitive_automation",
        title: "Aprobar automatizacion sensible",
        summary: "Requiere aprobacion SUPERADMIN antes de ejecutar.",
      };
  }
}

function summaryFromCounts(input: {
  total: number;
  automaticCount: number;
  manualCount: number;
  superadminApprovalCount: number;
}): string {
  if (input.total === 0) {
    return "No hay acciones operativas pendientes.";
  }

  if (input.superadminApprovalCount > 0) {
    return `${input.superadminApprovalCount} accion requiere aprobacion SUPERADMIN.`;
  }

  if (input.manualCount > 0) {
    return `${input.manualCount} accion requiere trabajo humano.`;
  }

  return `${input.automaticCount} accion puede automatizarse con auditoria.`;
}
