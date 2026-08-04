import { getSemesterPeriod } from "@/lib/operational/status";
import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";

export type SnapshotTimelineEventType =
  | "snapshot_created"
  | "health_status_changed"
  | "critical_items_changed"
  | "blocked_actions_changed"
  | "retention_changed";

export type SnapshotTimelineSeverity = "positive" | "neutral" | "warning" | "critical";

export type SnapshotTimelineEvent = {
  id: string;
  type: SnapshotTimelineEventType;
  severity: SnapshotTimelineSeverity;
  archiveKey: string;
  generatedAt: string;
  semester: string;
  title: string;
  summary: string;
  delta?: number;
};

export type SnapshotTimeline = {
  events: SnapshotTimelineEvent[];
  summary: {
    totalEvents: number;
    criticalEvents: number;
    warningEvents: number;
    latestEventAt: string | null;
  };
};

export function buildSnapshotTimeline(input: {
  manifests: OperationalSnapshotManifest[];
  limit?: number;
}): SnapshotTimeline {
  const sorted = [...input.manifests].sort((left, right) =>
    Date.parse(left.generatedAt) - Date.parse(right.generatedAt),
  );

  const events = sorted.flatMap((manifest, index) =>
    buildEventsForManifest(manifest, sorted[index - 1]),
  );

  const ordered = events.sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt));
  const limit = normalizeLimit(input.limit);
  const limited = limit === null ? ordered : ordered.slice(0, limit);

  return {
    events: limited,
    summary: {
      totalEvents: ordered.length,
      criticalEvents: ordered.filter((event) => event.severity === "critical").length,
      warningEvents: ordered.filter((event) => event.severity === "warning").length,
      latestEventAt: ordered[0]?.generatedAt ?? null,
    },
  };
}

function buildEventsForManifest(
  current: OperationalSnapshotManifest,
  previous: OperationalSnapshotManifest | undefined,
): SnapshotTimelineEvent[] {
  const events: SnapshotTimelineEvent[] = [
    event({
      current,
      type: "snapshot_created",
      severity: severityFromHealth(current.healthStatus),
      title: "Snapshot operacional registrado",
      summary: `Pulso ${current.healthStatus} con puntaje ${current.healthScore}.`,
    }),
  ];

  if (!previous) {
    return events;
  }

  if (current.healthStatus !== previous.healthStatus) {
    events.push(
      event({
        current,
        type: "health_status_changed",
        severity: severityFromHealth(current.healthStatus),
        title: "Cambio de pulso operacional",
        summary: `El pulso cambio de ${previous.healthStatus} a ${current.healthStatus}.`,
      }),
    );
  }

  const criticalDelta = current.criticalItems - previous.criticalItems;
  if (criticalDelta !== 0) {
    events.push(
      event({
        current,
        type: "critical_items_changed",
        severity: criticalDelta > 0 ? "critical" : "positive",
        title: "Variacion de pendientes criticos",
        summary: describeDelta("pendientes criticos", criticalDelta),
        delta: criticalDelta,
      }),
    );
  }

  const blockedDelta = current.blockedActions - previous.blockedActions;
  if (blockedDelta !== 0) {
    events.push(
      event({
        current,
        type: "blocked_actions_changed",
        severity: blockedDelta > 0 ? "critical" : "positive",
        title: "Variacion de acciones bloqueadas",
        summary: describeDelta("acciones bloqueadas", blockedDelta),
        delta: blockedDelta,
      }),
    );
  }

  if (current.retentionTier !== previous.retentionTier) {
    events.push(
      event({
        current,
        type: "retention_changed",
        severity: current.retentionTier === "founder_archive" ? "warning" : "neutral",
        title: "Cambio de retencion historica",
        summary: `La retencion cambio de ${previous.retentionTier} a ${current.retentionTier}.`,
      }),
    );
  }

  return events;
}

function event(input: {
  current: OperationalSnapshotManifest;
  type: SnapshotTimelineEventType;
  severity: SnapshotTimelineSeverity;
  title: string;
  summary: string;
  delta?: number;
}): SnapshotTimelineEvent {
  const semester = getSemesterPeriod(new Date(input.current.generatedAt));

  return {
    id: `${input.current.archiveKey}:${input.type}`,
    type: input.type,
    severity: input.severity,
    archiveKey: input.current.archiveKey,
    generatedAt: input.current.generatedAt,
    semester: `${semester.year}-${semester.code}`,
    title: input.title,
    summary: input.summary,
    ...(typeof input.delta === "number" ? { delta: input.delta } : {}),
  };
}

function severityFromHealth(healthStatus: string): SnapshotTimelineSeverity {
  if (healthStatus === "critical") return "critical";
  if (healthStatus === "risk" || healthStatus === "watch") return "warning";
  return "neutral";
}

function describeDelta(label: string, delta: number): string {
  if (delta > 0) {
    return `Aumentan ${delta} ${label}.`;
  }

  return `Disminuyen ${Math.abs(delta)} ${label}.`;
}

function normalizeLimit(limit: number | undefined): number | null {
  if (typeof limit !== "number") {
    return null;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.floor(limit);
}
