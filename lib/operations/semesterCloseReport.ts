import type { OperationalSemesterSummary } from "@/lib/operations/operationalSemesterSummary";
import type {
  SemesterCloseDecision,
  SemesterCloseStatus,
} from "@/lib/operations/semesterCloseDecision";

export type SemesterCloseReportTone = "success" | "warning" | "danger" | "neutral";

export type SemesterCloseReportMetric = {
  label: string;
  value: string;
  tone: SemesterCloseReportTone;
};

export type SemesterCloseReportSection = {
  title: string;
  items: string[];
};

export type SemesterCloseReport = {
  title: string;
  periodLabel: string;
  statusLabel: string;
  tone: SemesterCloseReportTone;
  executiveSummary: string;
  metrics: SemesterCloseReportMetric[];
  checklist: SemesterCloseDecision["checklist"];
  sections: SemesterCloseReportSection[];
  recommendedFocus: string;
};

export function buildSemesterCloseReport(input: {
  summary: OperationalSemesterSummary;
  decision: SemesterCloseDecision;
}): SemesterCloseReport {
  return {
    title: `Cierre operacional ${input.summary.semester.year}-${input.summary.semester.code}`,
    periodLabel: `${input.summary.semester.startsAt} al ${input.summary.semester.endsAt}`,
    statusLabel: statusLabel(input.decision.status),
    tone: toneFromStatus(input.decision.status),
    executiveSummary: buildExecutiveSummary(input.summary, input.decision),
    metrics: buildMetrics(input.summary),
    checklist: input.decision.checklist,
    sections: buildSections(input.summary, input.decision),
    recommendedFocus: input.summary.recommendedFocus,
  };
}

function buildMetrics(
  summary: OperationalSemesterSummary,
): SemesterCloseReportMetric[] {
  return [
    {
      label: "Snapshots",
      value: String(summary.totalSnapshots),
      tone: summary.totalSnapshots > 0 ? "neutral" : "danger",
    },
    {
      label: "Pulso final",
      value:
        summary.latestHealthScore === null
          ? "Sin datos"
          : `${summary.latestHealthScore} puntos`,
      tone: toneFromHealth(summary.latestHealthStatus),
    },
    {
      label: "Variacion de pulso",
      value: formatDelta(summary.healthScoreDelta, " puntos"),
      tone: toneFromDelta(summary.healthScoreDelta, true),
    },
    {
      label: "Criticos abiertos",
      value: String(summary.latestCriticalItems ?? 0),
      tone: (summary.latestCriticalItems ?? 0) > 0 ? "danger" : "success",
    },
    {
      label: "Bloqueos abiertos",
      value: String(summary.latestBlockedActions ?? 0),
      tone: (summary.latestBlockedActions ?? 0) > 0 ? "danger" : "success",
    },
    {
      label: "Tendencia",
      value: trendLabel(summary.trend),
      tone: toneFromTrend(summary.trend),
    },
  ];
}

function buildSections(
  summary: OperationalSemesterSummary,
  decision: SemesterCloseDecision,
): SemesterCloseReportSection[] {
  return [
    {
      title: "Resultado",
      items: [
        decision.summary,
        decision.canClose
          ? "El cierre puede avanzar a registro formal."
          : "El cierre debe esperar acciones correctivas.",
      ],
    },
    {
      title: "Trazabilidad",
      items: [
        `Primer snapshot: ${summary.firstSnapshotAt ?? "sin registro"}.`,
        `Ultimo snapshot: ${summary.latestSnapshotAt ?? "sin registro"}.`,
        `Eventos criticos: ${summary.criticalEvents}.`,
        `Advertencias: ${summary.warningEvents}.`,
      ],
    },
    {
      title: "Gobernanza",
      items: [
        decision.requiresSuperadminReview
          ? "Requiere revision SUPERADMIN antes de cerrar."
          : "No requiere revision SUPERADMIN para cerrar.",
        `Razones: ${decision.reasons.join(", ")}.`,
      ],
    },
  ];
}

function buildExecutiveSummary(
  summary: OperationalSemesterSummary,
  decision: SemesterCloseDecision,
): string {
  if (decision.status === "insufficient_data") {
    return "El semestre no cuenta con informacion suficiente para una decision operacional confiable.";
  }

  if (decision.status === "blocked") {
    return "El semestre presenta riesgos abiertos que impiden el cierre operacional.";
  }

  if (decision.status === "ready_with_observations") {
    return "El semestre puede cerrarse, dejando constancia de eventos y advertencias detectadas.";
  }

  return `El semestre cierra con tendencia ${trendLabel(summary.trend).toLowerCase()} y sin bloqueos criticos abiertos.`;
}

function statusLabel(status: SemesterCloseStatus): string {
  if (status === "ready") return "Listo";
  if (status === "ready_with_observations") return "Listo con observaciones";
  if (status === "blocked") return "Bloqueado";
  return "Datos insuficientes";
}

function toneFromStatus(status: SemesterCloseStatus): SemesterCloseReportTone {
  if (status === "ready") return "success";
  if (status === "ready_with_observations") return "warning";
  if (status === "blocked") return "danger";
  return "neutral";
}

function toneFromHealth(healthStatus: string | null): SemesterCloseReportTone {
  if (healthStatus === "critical") return "danger";
  if (healthStatus === "risk" || healthStatus === "watch") return "warning";
  if (healthStatus === "healthy") return "success";
  return "neutral";
}

function toneFromTrend(
  trend: OperationalSemesterSummary["trend"],
): SemesterCloseReportTone {
  if (trend === "improved") return "success";
  if (trend === "worsened") return "danger";
  return "neutral";
}

function toneFromDelta(delta: number, higherIsBetter: boolean): SemesterCloseReportTone {
  if (delta === 0) return "neutral";
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  return improved ? "success" : "warning";
}

function formatDelta(delta: number, suffix: string): string {
  const direction = delta > 0 ? "+" : "";
  return `${direction}${delta}${suffix}`;
}

function trendLabel(trend: OperationalSemesterSummary["trend"]): string {
  if (trend === "improved") return "Mejorando";
  if (trend === "worsened") return "Empeorando";
  return "Estable";
}
