import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalSnapshot } from "./operationalSnapshot";
import { decideSnapshotArchive } from "./snapshotArchivePolicy";

const healthySnapshot = buildOperationalSnapshot({
  profiles: [],
  generatedAt: new Date("2026-08-01T12:00:00Z"),
});

describe("snapshot archive policy", () => {
  it("keeps daily snapshots for short term retention", () => {
    const decision = decideSnapshotArchive({
      snapshot: healthySnapshot,
      cadence: "daily",
      now: new Date("2026-08-01T12:00:00Z"),
    });

    assert.equal(decision.retentionTier, "short_term");
    assert.equal(decision.retainUntil, "2026-09-15");
    assert.equal(decision.shouldPersist, true);
  });

  it("keeps weekly snapshots until the semester ends", () => {
    const decision = decideSnapshotArchive({
      snapshot: healthySnapshot,
      cadence: "weekly",
      now: new Date("2026-08-01T12:00:00Z"),
    });

    assert.equal(decision.retentionTier, "semester");
    assert.equal(decision.retainUntil, "2026-12-31");
    assert.equal(decision.archiveKey.semester, "S2");
  });

  it("keeps semester close snapshots for annual retention", () => {
    const decision = decideSnapshotArchive({
      snapshot: healthySnapshot,
      cadence: "semester_close",
      now: new Date("2026-12-31T12:00:00Z"),
    });

    assert.equal(decision.retentionTier, "annual");
    assert.equal(decision.retainUntil, "2031-12-31");
  });

  it("does not persist healthy manual snapshots by default", () => {
    const decision = decideSnapshotArchive({
      snapshot: healthySnapshot,
      cadence: "manual",
      now: new Date("2026-08-01T12:00:00Z"),
    });

    assert.equal(decision.retentionTier, "founder_archive");
    assert.equal(decision.retainUntil, null);
    assert.equal(decision.shouldPersist, false);
  });
});
