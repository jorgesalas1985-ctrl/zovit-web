import type { OperationalSnapshotComparison } from "@/lib/operations/snapshotComparison";

export type TrendReportSeverity = "positive" | "neutral" | "warning";

export type TrendReportHighlight = {
  label: string;
  value: string;
  severity: TrendReportSeverity;
};

export type OperationalTrendReport = {
  title: string;
  summary: string;
  highlights: TrendReportHighlight[];
  recommendedFocus: string;
};

export function buildOperationalTrendReport(
  comparison: OperationalSnapshotComparison,
): OperationalTrendReport {
  const highlights: TrendReportHighlight[] = [
    highlight("Pulso", comparison.score.delta, "puntos", true),
    highlight("Pendientes", comparison.totalItems.delta, "", false),
    highlight("Acciones humanas", comparison.humanActions.delta, "", false),
    highlight("Bloqueos", comparison.blockedActions.delta, "", false),
    highlight("Criticos", comparison.criticalItems.delta, "", false),
  ];

  return {
    title: titleFromTrend(comparison.trend),
    summary: comparison.summary,
    highlights,
    recommendedFocus: focusFromComparison(comparison),
  };
}

function titleFromTrend(trend: OperationalSnapshotComparison["trend"]): string {
  if (trend === "improved") return "Mejora operacional";
  if (trend === "worsened") return "Deterioro operacional";
  return "Operacion estable";
}

function highlight(
  label: string,
  delta: number,
  suffix: string,
  higherIsBetter: boolean,
): TrendReportHighlight {
  const direction = delta > 0 ? "+" : "";
  const value = `${direction}${delta}${suffix ? ` ${suffix}` : ""}`;
  const severity = severityFromDelta(delta, higherIsBetter);

  return { label, value, severity };
}

function severityFromDelta(delta: number, higherIsBetter: boolean): TrendReportSeverity {
  if (delta === 0) return "neutral";
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  return improved ? "positive" : "warning";
}

function focusFromComparison(comparison: OperationalSnapshotComparison): string {
  if (comparison.blockedActions.delta > 0) {
    return "Resolver acciones bloqueadas antes de ejecutar automatizaciones.";
  }

  if (comparison.criticalItems.delta > 0) {
    return "Atender pendientes criticos y reducir riesgo operacional.";
  }

  if (comparison.humanActions.delta > 0) {
    return "Asignar responsables para disminuir revisiones humanas acumuladas.";
  }

  if (comparison.totalItems.delta < 0 && comparison.score.delta > 0) {
    return "Mantener el ritmo de cierre de pendientes y documentar las acciones efectivas.";
  }

  if (comparison.trend === "stable") {
    return "Mantener monitoreo y evitar acumulacion de pendientes semestrales.";
  }

  return "Revisar el Centro de Control y priorizar las recomendaciones ejecutivas.";
}
