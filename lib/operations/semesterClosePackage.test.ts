import assert from "node:assert/strict";
import test from "node:test";

import { buildSemesterClosePackage } from "@/lib/operations/semesterClosePackage";
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

test("builds a complete semester close package from manifests", () => {
  const closePackage = buildSemesterClosePackage({
    year: 2026,
    semester: "S1",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S1/2026-07-30",
        generatedAt: "2026-07-30T10:00:00.000Z",
        healthScore: 90,
      }),
      manifest({
        archiveKey: "semester-close/2026-S1/2026-07-31",
        generatedAt: "2026-07-31T20:00:00.000Z",
        healthScore: 100,
      }),
    ],
  });

  assert.equal(closePackage.summary.totalSnapshots, 2);
  assert.equal(closePackage.decision.status, "ready");
  assert.equal(closePackage.report.title, "Cierre operacional 2026-S1");
  assert.equal(closePackage.report.statusLabel, "Listo");
  assert.equal(closePackage.actionItems[0]?.type, "finalize_semester_close");
});

test("keeps package blocked when critical risk remains open", () => {
  const closePackage = buildSemesterClosePackage({
    year: 2026,
    semester: "S2",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S2/2026-08-01",
        generatedAt: "2026-08-01T10:00:00.000Z",
        healthStatus: "critical",
        healthScore: 35,
        criticalItems: 1,
        blockedActions: 1,
      }),
    ],
  });

  assert.equal(closePackage.summary.latestCriticalItems, 1);
  assert.equal(closePackage.decision.status, "blocked");
  assert.equal(closePackage.report.tone, "danger");
  assert.ok(
    closePackage.actionItems.some(
      (item) => item.type === "request_superadmin_review",
    ),
  );
});
