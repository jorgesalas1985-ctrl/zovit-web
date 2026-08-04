import assert from "node:assert/strict";
import test from "node:test";

import { buildCurrentSemesterClose } from "@/lib/operations/currentSemesterClose";
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

test("monitors active semester without starting formal close too early", () => {
  const current = buildCurrentSemesterClose({
    now: new Date("2026-04-10T12:00:00.000Z"),
    manifests: [
      manifest({
        archiveKey: "daily/2026-S1/2026-04-10",
        generatedAt: "2026-04-10T10:00:00.000Z",
      }),
    ],
  });

  assert.equal(current.target.mode, "active_semester");
  assert.equal(current.summary.semester.code, "S1");
  assert.equal(
    current.operationalRecommendation,
    "Mantener monitoreo operacional; el cierre formal aun no debe iniciarse.",
  );
});

test("prepares close during closing window", () => {
  const current = buildCurrentSemesterClose({
    now: new Date("2026-07-25T12:00:00.000Z"),
    manifests: [
      manifest({
        archiveKey: "semester-close/2026-S1/2026-07-25",
        generatedAt: "2026-07-25T10:00:00.000Z",
      }),
    ],
  });

  assert.equal(current.target.mode, "closing_window");
  assert.equal(current.decision.status, "ready");
  assert.equal(
    current.operationalRecommendation,
    "Preparar cierre formal del semestre con reporte ejecutivo.",
  );
});

test("uses previous semester outside operational semester", () => {
  const current = buildCurrentSemesterClose({
    now: new Date("2027-01-10T12:00:00.000Z"),
    manifests: [
      manifest({
        archiveKey: "semester-close/2026-S2/2026-12-31",
        generatedAt: "2026-12-31T10:00:00.000Z",
      }),
    ],
  });

  assert.equal(current.target.mode, "out_of_semester");
  assert.equal(current.target.year, 2026);
  assert.equal(current.target.semester, "S2");
  assert.equal(current.report.title, "Cierre operacional 2026-S2");
});

test("keeps current close blocked when target package is blocked", () => {
  const current = buildCurrentSemesterClose({
    now: new Date("2026-12-25T12:00:00.000Z"),
    manifests: [
      manifest({
        archiveKey: "daily/2026-S2/2026-12-25",
        generatedAt: "2026-12-25T10:00:00.000Z",
        healthStatus: "critical",
        healthScore: 30,
        criticalItems: 2,
      }),
    ],
  });

  assert.equal(current.target.mode, "closing_window");
  assert.equal(current.decision.status, "blocked");
  assert.equal(
    current.operationalRecommendation,
    "Priorizar correcciones criticas antes de cerrar el semestre.",
  );
});
