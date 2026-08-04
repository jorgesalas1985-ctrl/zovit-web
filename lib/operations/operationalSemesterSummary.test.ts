import assert from "node:assert/strict";
import test from "node:test";

import { buildOperationalSemesterSummary } from "@/lib/operations/operationalSemesterSummary";
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

test("summarizes one semester from manifest history", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S1/2026-07-31",
        generatedAt: "2026-07-31T10:00:00.000Z",
        healthScore: 70,
      }),
      manifest({
        archiveKey: "daily/2026-S2/2026-08-01",
        generatedAt: "2026-08-01T10:00:00.000Z",
        healthStatus: "critical",
        healthScore: 45,
        criticalItems: 2,
        blockedActions: 1,
      }),
      manifest({
        archiveKey: "daily/2026-S2/2026-08-15",
        generatedAt: "2026-08-15T10:00:00.000Z",
        healthStatus: "watch",
        healthScore: 80,
        criticalItems: 0,
        blockedActions: 0,
      }),
    ],
  });

  assert.equal(summary.totalSnapshots, 2);
  assert.equal(summary.firstSnapshotAt, "2026-08-01T10:00:00.000Z");
  assert.equal(summary.latestSnapshotAt, "2026-08-15T10:00:00.000Z");
  assert.equal(summary.healthScoreDelta, 35);
  assert.equal(summary.criticalItemsDelta, -2);
  assert.equal(summary.blockedActionsDelta, -1);
  assert.equal(summary.trend, "improved");
  assert.equal(summary.readyForClose, false);
  assert.equal(summary.recommendedFocus, "Resolver eventos criticos antes del cierre semestral.");
});

test("marks clean semester as ready for close", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S1",
    manifests: [
      manifest({
        archiveKey: "weekly/2026-S1/2026-07-24",
        generatedAt: "2026-07-24T10:00:00.000Z",
        healthStatus: "healthy",
        healthScore: 95,
      }),
      manifest({
        archiveKey: "semester-close/2026-S1/2026-07-31",
        generatedAt: "2026-07-31T20:00:00.000Z",
        healthStatus: "healthy",
        healthScore: 100,
        retentionTier: "annual",
      }),
    ],
  });

  assert.equal(summary.readyForClose, true);
  assert.equal(summary.trend, "improved");
  assert.equal(
    summary.recommendedFocus,
    "Mantener el ritmo de mejora y preparar cierre semestral auditable.",
  );
});

test("returns an empty summary when there are no manifests for the semester", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [],
  });

  assert.equal(summary.totalSnapshots, 0);
  assert.equal(summary.firstSnapshotAt, null);
  assert.equal(summary.latestHealthScore, null);
  assert.equal(summary.readyForClose, false);
  assert.equal(
    summary.recommendedFocus,
    "Generar el primer snapshot del semestre para iniciar trazabilidad operacional.",
  );
});
