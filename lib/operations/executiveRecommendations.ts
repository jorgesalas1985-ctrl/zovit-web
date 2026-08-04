import type { ControlCenterDecision } from "@/lib/operations/controlCenter";
import type { ExecutionPolicyDecision } from "@/lib/operations/executionPolicy";
import type { OperationalHealthPulse } from "@/lib/operations/healthPulse";

export type ExecutiveRecommendationPriority = "critical" | "high" | "medium" | "low";

export type ExecutiveRecommendationType =
  | "resolve_blocked_actions"
  | "review_critical_alerts"
  | "request_superadmin_approval"
  | "process_human_reviews"
  | "execute_automatic_actions"
  | "monitor_operational_pulse";

export type ExecutiveRecommendation = {
  id: string;
  type: ExecutiveRecommendationType;
  priority: ExecutiveRecommendationPriority;
  title: string;
  summary: string;
};

export type ExecutiveRecommendationDecision = {
  recommendations: ExecutiveRecommendation[];
  highestPriority: ExecutiveRecommendationPriority | null;
  summary: string;
};

const PRIORITY_SCORE: Record<ExecutiveRecommendationPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function buildExecutiveRecommendations(input: {
  controlCenter: ControlCenterDecision;
  executionPolicy: ExecutionPolicyDecision;
  healthPulse: OperationalHealthPulse;
  limit?: number;
}): ExecutiveRecommendationDecision {
  const recommendations: ExecutiveRecommendation[] = [];

  if (input.executionPolicy.blockedCount > 0) {
    recommendations.push({
      id: "resolve-blocked-actions",
      type: "resolve_blocked_actions",
      priority: "critical",
      title: "Resolver acciones bloqueadas",
      summary: "Revisar la politica operativa antes de ejecutar cambios sensibles.",
    });
  }

  if (input.controlCenter.priorityMetrics.critical > 0) {
    recommendations.push({
      id: "review-critical-alerts",
      type: "review_critical_alerts",
      priority: "critical",
      title: "Atender alertas criticas",
      summary: "Priorizar suspensiones, vencimientos y bloqueos de mayor impacto.",
    });
  }

  if (input.executionPolicy.superadminApprovalCount > 0) {
    recommendations.push({
      id: "request-superadmin-approval",
      type: "request_superadmin_approval",
      priority: "high",
      title: "Solicitar aprobacion SUPERADMIN",
      summary: "Las automatizaciones sensibles deben quedar aprobadas antes de ejecutarse.",
    });
  }

  if (input.executionPolicy.manualCount > 0 || input.controlCenter.requiresHumanAction > 0) {
    recommendations.push({
      id: "process-human-reviews",
      type: "process_human_reviews",
      priority: "high",
      title: "Procesar revisiones humanas",
      summary: "Asignar responsables para documentos, evaluaciones o segundas revisiones.",
    });
  }

  if (input.executionPolicy.executableCount > 0) {
    recommendations.push({
      id: "execute-automatic-actions",
      type: "execute_automatic_actions",
      priority: input.healthPulse.status === "healthy" ? "low" : "medium",
      title: "Ejecutar acciones automaticas",
      summary: "Aplicar acciones permitidas con registro de auditoria.",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "monitor-operational-pulse",
      type: "monitor_operational_pulse",
      priority: "low",
      title: "Monitorear pulso operacional",
      summary: "Mantener seguimiento del ecosistema sin acciones inmediatas.",
    });
  }

  const sorted = recommendations.sort(
    (left, right) => PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority],
  );
  const limited = sorted.slice(0, input.limit ?? 5);

  return {
    recommendations: limited,
    highestPriority: limited[0]?.priority ?? null,
    summary: summaryFromRecommendations(limited),
  };
}

function summaryFromRecommendations(recommendations: ExecutiveRecommendation[]): string {
  if (!recommendations.length) {
    return "No hay recomendaciones ejecutivas pendientes.";
  }

  const criticalCount = recommendations.filter((item) => item.priority === "critical").length;
  if (criticalCount > 0) {
    return `${criticalCount} recomendacion critica debe priorizarse.`;
  }

  const highCount = recommendations.filter((item) => item.priority === "high").length;
  if (highCount > 0) {
    return `${highCount} recomendacion de alta prioridad requiere gestion.`;
  }

  return `${recommendations.length} recomendacion de seguimiento operativo.`;
}
