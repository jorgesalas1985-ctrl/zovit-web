import type { OperationalSnapshot } from "@/lib/operations/operationalSnapshot";

export type SnapshotTrend = "improved" | "stable" | "worsened";

export type SnapshotComparisonMetric = {
  current: number;
  previous: number;
  delta: number;
};

export type OperationalSnapshotComparison = {
  trend: SnapshotTrend;
  score: SnapshotComparisonMetric;
  totalItems: SnapshotComparisonMetric;
  humanActions: SnapshotComparisonMetric;
  blockedActions: SnapshotComparisonMetric;
  criticalItems: SnapshotComparisonMetric;
  summary: string;
};

export function compareOperationalSnapshots(input: {
  previous: OperationalSnapshot;
  current: OperationalSnapshot;
}): OperationalSnapshotComparison {
  const score = metric(input.previous.healthPulse.score, input.current.healthPulse.score);
  const totalItems = metric(
    input.previous.controlCenter.totalItems,
    input.current.controlCenter.totalItems,
  );
  const humanActions = metric(
    input.previous.controlCenter.requiresHumanAction,
    input.current.controlCenter.requiresHumanAction,
  );
  const blockedActions = metric(
    input.previous.executionPolicy.blockedCount,
    input.current.executionPolicy.blockedCount,
  );
  const criticalItems = metric(
    input.previous.controlCenter.priorityMetrics.critical,
    input.current.controlCenter.priorityMetrics.critical,
  );

  const trend = resolveTrend({
    score,
    totalItems,
    humanActions,
    blockedActions,
    criticalItems,
  });

  return {
    trend,
    score,
    totalItems,
    humanActions,
    blockedActions,
    criticalItems,
    summary: summaryFromTrend(trend, score),
  };
}

function metric(previous: number, current: number): SnapshotComparisonMetric {
  return {
    previous,
    current,
    delta: current - previous,
  };
}

function resolveTrend(input: {
  score: SnapshotComparisonMetric;
  totalItems: SnapshotComparisonMetric;
  humanActions: SnapshotComparisonMetric;
  blockedActions: SnapshotComparisonMetric;
  criticalItems: SnapshotComparisonMetric;
}): SnapshotTrend {
  let weight = 0;

  weight += input.score.delta;
  weight -= input.totalItems.delta * 2;
  weight -= input.humanActions.delta * 3;
  weight -= input.blockedActions.delta * 8;
  weight -= input.criticalItems.delta * 10;

  if (weight >= 5) return "improved";
  if (weight <= -5) return "worsened";
  return "stable";
}

function summaryFromTrend(trend: SnapshotTrend, score: SnapshotComparisonMetric): string {
  if (trend === "improved") {
    return `El estado operacional mejoro ${score.delta} puntos.`;
  }

  if (trend === "worsened") {
    return `El estado operacional empeoro ${Math.abs(score.delta)} puntos.`;
  }

  return "El estado operacional se mantiene estable.";
}
