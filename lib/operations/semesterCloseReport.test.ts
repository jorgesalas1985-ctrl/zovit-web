import assert from "node:assert/strict";
import test from "node:test";

import { buildOperationalSemesterSummary } from "@/lib/operations/operationalSemesterSummary";
import { decideSemesterClose } from "@/lib/operations/semesterCloseDecision";
import { buildSemesterCloseReport } from "@/lib/operations/semesterCloseReport";
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

test("builds an executive semester close report for a clean close", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S1",
    manifests: [
      manifest({
        archiveKey: "weekly/2026-S1/2026-07-24",
        generatedAt: "2026-07-24T10:00:00.000Z",
        healthScore: 95,
      }),
      manifest({
        archiveKey: "semester-close/2026-S1/2026-07-31",
        generatedAt: "2026-07-31T20:00:00.000Z",
        healthScore: 100,
      }),
    ],
  });

  const report = buildSemesterCloseReport({
    summary,
    decision: decideSemesterClose(summary),
  });

  assert.equal(report.title, "Cierre operacional 2026-S1");
  assert.equal(report.statusLabel, "Listo");
  assert.equal(report.tone, "success");
  assert.equal(report.metrics.find((metric) => metric.label === "Pulso final")?.value, "100 puntos");
  assert.equal(report.sections.length, 3);
});

test("builds a blocked report when close requires superadmin review", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S2/2026-08-31",
        generatedAt: "2026-08-31T20:00:00.000Z",
        healthStatus: "critical",
        healthScore: 35,
        criticalItems: 2,
        blockedActions: 1,
      }),
    ],
  });

  const report = buildSemesterCloseReport({
    summary,
    decision: decideSemesterClose(summary),
  });

  assert.equal(report.statusLabel, "Bloqueado");
  assert.equal(report.tone, "danger");
  assert.equal(
    report.executiveSummary,
    "El semestre presenta riesgos abiertos que impiden el cierre operacional.",
  );
  assert.ok(report.sections[2]?.items[0]?.includes("SUPERADMIN"));
});
