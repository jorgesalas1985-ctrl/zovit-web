import assert from "node:assert/strict";
import test from "node:test";

import { buildSnapshotTimeline } from "@/lib/operations/snapshotTimeline";
import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";

function manifest(
  partial: Partial<OperationalSnapshotManifest> &
    Pick<OperationalSnapshotManifest, "archiveKey" | "generatedAt">,
): OperationalSnapshotManifest {
  return {
    archiveKey: partial.archiveKey,
    schemaName: partial.schemaName ?? "zovit.operational_snapshot",
    schemaVersion: partial.schemaVersion ?? "1.0.0",
    generatedAt: partial.generatedAt,
    source: partial.source ?? "in_memory_profiles",
    healthStatus: partial.healthStatus ?? "healthy",
    healthScore: partial.healthScore ?? 100,
    totalProfiles: partial.totalProfiles ?? 10,
    totalItems: partial.totalItems ?? 0,
    criticalItems: partial.criticalItems ?? 0,
    humanActions: partial.humanActions ?? 0,
    blockedActions: partial.blockedActions ?? 0,
    retentionTier: partial.retentionTier ?? "short_term",
    retainUntil: partial.retainUntil ?? "2026-09-15T00:00:00.000Z",
    shouldPersist: partial.shouldPersist ?? true,
  };
}

test("builds timeline events from manifest changes", () => {
  const timeline = buildSnapshotTimeline({
    manifests: [
      manifest({
        archiveKey: "daily/2026-S2/2026-08-01",
        generatedAt: "2026-08-01T10:00:00.000Z",
        healthStatus: "watch",
        healthScore: 80,
        criticalItems: 1,
        blockedActions: 0,
      }),
      manifest({
        archiveKey: "daily/2026-S2/2026-08-02",
        generatedAt: "2026-08-02T10:00:00.000Z",
        healthStatus: "critical",
        healthScore: 40,
        criticalItems: 3,
        blockedActions: 2,
        retentionTier: "founder_archive",
      }),
    ],
  });

  assert.equal(timeline.summary.totalEvents, 6);
  assert.equal(timeline.summary.criticalEvents, 3);
  assert.equal(timeline.summary.warningEvents, 2);
  assert.equal(timeline.summary.latestEventAt, "2026-08-02T10:00:00.000Z");

  assert.deepEqual(
    timeline.events.slice(0, 5).map((event) => event.type),
    [
      "snapshot_created",
      "health_status_changed",
      "critical_items_changed",
      "blocked_actions_changed",
      "retention_changed",
    ],
  );
});

test("limits returned events while keeping full summary", () => {
  const timeline = buildSnapshotTimeline({
    manifests: [
      manifest({
        archiveKey: "daily/2026-S1/2026-07-30",
        generatedAt: "2026-07-30T10:00:00.000Z",
      }),
      manifest({
        archiveKey: "daily/2026-S1/2026-07-31",
        generatedAt: "2026-07-31T10:00:00.000Z",
        criticalItems: 1,
      }),
    ],
    limit: 1,
  });

  assert.equal(timeline.summary.totalEvents, 3);
  assert.equal(timeline.events.length, 1);
  assert.equal(timeline.events[0]?.archiveKey, "daily/2026-S1/2026-07-31");
  assert.equal(timeline.events[0]?.semester, "2026-S1");
});
