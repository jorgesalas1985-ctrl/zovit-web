import type { SemesterCode } from "@/lib/operational/status";
import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";
import { buildSnapshotTimeline } from "@/lib/operations/snapshotTimeline";

export type OperationalSemesterSummaryTrend = "improved" | "stable" | "worsened";

export type OperationalSemesterSummary = {
  semester: {
    year: number;
    code: Exclude<SemesterCode, "OUT_OF_SEMESTER">;
    startsAt: string;
    endsAt: string;
  };
  totalSnapshots: number;
  firstSnapshotAt: string | null;
  latestSnapshotAt: string | null;
  initialHealthScore: number | null;
  latestHealthScore: number | null;
  healthScoreDelta: number;
  latestHealthStatus: string | null;
  latestCriticalItems: number | null;
  latestBlockedActions: number | null;
  criticalEvents: number;
  warningEvents: number;
  criticalItemsDelta: number;
  blockedActionsDelta: number;
  trend: OperationalSemesterSummaryTrend;
  readyForClose: boolean;
  recommendedFocus: string;
};

export function buildOperationalSemesterSummary(input: {
  manifests: OperationalSnapshotManifest[];
  year: number;
  semester: Exclude<SemesterCode, "OUT_OF_SEMESTER">;
}): OperationalSemesterSummary {
  const period = semesterPeriod(input.year, input.semester);
  const manifests = input.manifests
    .filter((manifest) => isInsidePeriod(manifest.generatedAt, period.startsAt, period.endsAt))
    .sort((left, right) => Date.parse(left.generatedAt) - Date.parse(right.generatedAt));

  const first = manifests[0];
  const latest = manifests[manifests.length - 1];
  const timeline = buildSnapshotTimeline({ manifests });

  const healthScoreDelta =
    first && latest ? latest.healthScore - first.healthScore : 0;
  const criticalItemsDelta =
    first && latest ? latest.criticalItems - first.criticalItems : 0;
  const blockedActionsDelta =
    first && latest ? latest.blockedActions - first.blockedActions : 0;

  const trend = resolveTrend({
    healthScoreDelta,
    criticalItemsDelta,
    blockedActionsDelta,
  });

  return {
    semester: period,
    totalSnapshots: manifests.length,
    firstSnapshotAt: first?.generatedAt ?? null,
    latestSnapshotAt: latest?.generatedAt ?? null,
    initialHealthScore: first?.healthScore ?? null,
    latestHealthScore: latest?.healthScore ?? null,
    healthScoreDelta,
    latestHealthStatus: latest?.healthStatus ?? null,
    latestCriticalItems: latest?.criticalItems ?? null,
    latestBlockedActions: latest?.blockedActions ?? null,
    criticalEvents: timeline.summary.criticalEvents,
    warningEvents: timeline.summary.warningEvents,
    criticalItemsDelta,
    blockedActionsDelta,
    trend,
    readyForClose: isReadyForClose(latest, timeline.summary.criticalEvents),
    recommendedFocus: recommendedFocus({
      totalSnapshots: manifests.length,
      latest,
      trend,
      criticalEvents: timeline.summary.criticalEvents,
      warningEvents: timeline.summary.warningEvents,
      criticalItemsDelta,
      blockedActionsDelta,
    }),
  };
}

function semesterPeriod(
  year: number,
  code: Exclude<SemesterCode, "OUT_OF_SEMESTER">,
): OperationalSemesterSummary["semester"] {
  if (code === "S1") {
    return {
      year,
      code,
      startsAt: `${year}-03-01`,
      endsAt: `${year}-07-31`,
    };
  }

  return {
    year,
    code,
    startsAt: `${year}-08-01`,
    endsAt: `${year}-12-31`,
  };
}

function isInsidePeriod(generatedAt: string, startsAt: string, endsAt: string): boolean {
  const generatedTime = Date.parse(generatedAt);

  if (Number.isNaN(generatedTime)) {
    return false;
  }

  return (
    generatedTime >= Date.parse(`${startsAt}T00:00:00.000Z`) &&
    generatedTime <= Date.parse(`${endsAt}T23:59:59.999Z`)
  );
}

function resolveTrend(input: {
  healthScoreDelta: number;
  criticalItemsDelta: number;
  blockedActionsDelta: number;
}): OperationalSemesterSummaryTrend {
  const weight =
    input.healthScoreDelta -
    input.criticalItemsDelta * 10 -
    input.blockedActionsDelta * 12;

  if (weight >= 5) return "improved";
  if (weight <= -5) return "worsened";
  return "stable";
}

function isReadyForClose(
  latest: OperationalSnapshotManifest | undefined,
  criticalEvents: number,
): boolean {
  if (!latest) {
    return false;
  }

  return (
    latest.healthStatus !== "critical" &&
    latest.criticalItems === 0 &&
    latest.blockedActions === 0 &&
    criticalEvents === 0
  );
}

function recommendedFocus(input: {
  totalSnapshots: number;
  latest: OperationalSnapshotManifest | undefined;
  trend: OperationalSemesterSummaryTrend;
  criticalEvents: number;
  warningEvents: number;
  criticalItemsDelta: number;
  blockedActionsDelta: number;
}): string {
  if (input.totalSnapshots === 0) {
    return "Generar el primer snapshot del semestre para iniciar trazabilidad operacional.";
  }

  if (input.latest?.healthStatus === "critical" || input.criticalEvents > 0) {
    return "Resolver eventos criticos antes del cierre semestral.";
  }

  if (input.blockedActionsDelta > 0) {
    return "Desbloquear acciones operativas retenidas por politica.";
  }

  if (input.criticalItemsDelta > 0) {
    return "Reducir pendientes criticos acumulados durante el semestre.";
  }

  if (input.warningEvents > 0) {
    return "Revisar advertencias y documentar decisiones de mitigacion.";
  }

  if (input.trend === "improved") {
    return "Mantener el ritmo de mejora y preparar cierre semestral auditable.";
  }

  return "Mantener monitoreo semanal y evitar acumulacion documental al cierre.";
}
