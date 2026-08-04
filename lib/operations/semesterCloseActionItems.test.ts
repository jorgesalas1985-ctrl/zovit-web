import assert from "node:assert/strict";
import test from "node:test";

import { buildOperationalSemesterSummary } from "@/lib/operations/operationalSemesterSummary";
import { decideSemesterClose } from "@/lib/operations/semesterCloseDecision";
import { buildSemesterCloseActionItems } from "@/lib/operations/semesterCloseActionItems";
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

test("creates corrective actions for blocked semester close", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [
      manifest({
        archiveKey: "daily/2026-S2/2026-12-20",
        generatedAt: "2026-12-20T10:00:00.000Z",
        healthStatus: "critical",
        healthScore: 30,
        criticalItems: 2,
        blockedActions: 1,
      }),
    ],
  });

  const items = buildSemesterCloseActionItems({
    summary,
    decision: decideSemesterClose(summary),
  });

  assert.deepEqual(
    items.map((item) => item.type),
    [
      "review_critical_pulse",
      "resolve_critical_items",
      "resolve_blocked_actions",
      "request_superadmin_review",
      "document_observations",
    ],
  );
});

test("creates finalize action for clean semester close", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S1",
    manifests: [
      manifest({
        archiveKey: "semester-close/2026-S1/2026-07-31",
        generatedAt: "2026-07-31T10:00:00.000Z",
      }),
    ],
  });

  const items = buildSemesterCloseActionItems({
    summary,
    decision: decideSemesterClose(summary),
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.type, "finalize_semester_close");
  assert.equal(items[0]?.priority, "low");
});

test("creates snapshot action when data is insufficient", () => {
  const summary = buildOperationalSemesterSummary({
    year: 2026,
    semester: "S2",
    manifests: [],
  });

  const items = buildSemesterCloseActionItems({
    summary,
    decision: decideSemesterClose(summary),
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.type, "generate_snapshot");
  assert.equal(items[0]?.priority, "high");
});
