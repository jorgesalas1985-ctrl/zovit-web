import assert from "node:assert/strict";
import test from "node:test";

import { buildOperationalSemesterSummary } from "@/lib/operations/operationalSemesterSummary";
import { decideSemesterClose } from "@/lib/operations/semesterCloseDecision";
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

test("blocks semester close when the latest snapshot has open critical risk", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S2/2026-08-01",
        generatedAt: "2026-08-01T10:00:00.000Z",
        healthStatus: "critical",
        healthScore: 40,
        criticalItems: 2,
        blockedActions: 1,
      }),
    ],
  });

  const close = decideSemesterClose(summary);

  assert.equal(close.status, "blocked");
  assert.equal(close.canClose, false);
  assert.equal(close.requiresSuperadminReview, true);
  assert.deepEqual(close.reasons.slice(0, 3), [
    "latest_snapshot_critical",
    "critical_items_open",
    "blocked_actions_open",
  ]);
});

test("allows close with observations when risks were resolved but history has warnings", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S2/2026-08-01",
        generatedAt: "2026-08-01T10:00:00.000Z",
        healthStatus: "critical",
        healthScore: 40,
        criticalItems: 2,
      }),
      manifest({
        archiveKey: "daily/2026-S2/2026-08-31",
        generatedAt: "2026-08-31T10:00:00.000Z",
        healthStatus: "healthy",
        healthScore: 95,
      }),
    ],
  });

  const close = decideSemesterClose(summary);

  assert.equal(close.status, "ready_with_observations");
  assert.equal(close.canClose, true);
  assert.equal(close.requiresSuperadminReview, false);
  assert.ok(close.reasons.includes("critical_events_detected"));
});

test("marks clean semester as ready", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S1",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S1/2026-07-31",
        generatedAt: "2026-07-31T10:00:00.000Z",
      }),
    ],
  });

  const close = decideSemesterClose(summary);

  assert.equal(close.status, "ready");
  assert.equal(close.canClose, true);
  assert.deepEqual(close.reasons, ["ready_for_close"]);
});

test("requires data before closing a semester", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [],
  });

  const close = decideSemesterClose(summary);

  assert.equal(close.status, "insufficient_data");
  assert.equal(close.canClose, false);
  assert.deepEqual(close.reasons, ["no_snapshots"]);
}
);
