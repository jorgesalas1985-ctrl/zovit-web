import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSnapshotManifestCatalog,
  type SnapshotManifestCatalogFilters,
} from "@/lib/operations/snapshotManifestCatalog";
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

const manifests = [
  manifest({
    archiveKey: "daily/2026-S2/2026-08-01",
    generatedAt: "2026-08-01T10:00:00.000Z",
    healthStatus: "watch",
    healthScore: 80,
    shouldPersist: true,
    retentionTier: "short_term",
  }),
  manifest({
    archiveKey: "manual/2026-S1/audit",
    generatedAt: "2026-07-31T23:00:00.000Z",
    healthStatus: "critical",
    healthScore: 30,
    shouldPersist: true,
    retentionTier: "founder_archive",
  }),
  manifest({
    archiveKey: "manual/2026-S1/healthy",
    generatedAt: "2026-07-15T12:00:00.000Z",
    healthStatus: "healthy",
    healthScore: 100,
    shouldPersist: false,
    retentionTier: "short_term",
  }),
];

test("orders manifests by generation date descending", () => {
  const catalog = buildSnapshotManifestCatalog({ manifests });

  assert.deepEqual(
    catalog.manifests.map((item) => item.archiveKey),
    [
      "daily/2026-S2/2026-08-01",
      "manual/2026-S1/audit",
      "manual/2026-S1/healthy",
    ],
  );
  assert.equal(catalog.summary.latestGeneratedAt, "2026-08-01T10:00:00.000Z");
});

test("filters by persistence and retention tier", () => {
  const filters: SnapshotManifestCatalogFilters = {
    shouldPersist: true,
    retentionTier: "founder_archive",
  };

  const catalog = buildSnapshotManifestCatalog({ manifests, filters });

  assert.equal(catalog.summary.total, 1);
  assert.equal(catalog.summary.persistent, 1);
  assert.equal(catalog.manifests[0]?.archiveKey, "manual/2026-S1/audit");
});

test("filters by date range and computes summary over filtered results", () => {
  const catalog = buildSnapshotManifestCatalog({
    manifests,
    filters: {
      from: "2026-07-31",
      to: "2026-08-01",
    },
    limit: 1,
  });

  assert.equal(catalog.summary.total, 2);
  assert.equal(catalog.summary.returned, 1);
  assert.equal(catalog.summary.critical, 1);
  assert.equal(catalog.summary.warning, 1);
  assert.equal(catalog.summary.averageHealthScore, 55);
  assert.equal(catalog.manifests.length, 1);
  assert.equal(catalog.manifests[0]?.archiveKey, "daily/2026-S2/2026-08-01");
});
