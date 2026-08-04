import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalSnapshot } from "./operationalSnapshot";
import { decideSnapshotArchive } from "./snapshotArchivePolicy";
import { buildOperationalSnapshotManifest } from "./snapshotManifest";

describe("operational snapshot manifest", () => {
  it("builds a lightweight index from snapshot and archive policy", () => {
    const snapshot = buildOperationalSnapshot({
      profiles: [],
      generatedAt: new Date("2026-08-01T12:00:00Z"),
    });
    const archive = decideSnapshotArchive({
      snapshot,
      cadence: "weekly",
      now: new Date("2026-08-01T12:00:00Z"),
    });

    const manifest = buildOperationalSnapshotManifest({ snapshot, archive });

    assert.equal(manifest.schemaName, "zovit.operational_snapshot");
    assert.equal(manifest.schemaVersion, "1.0.0");
    assert.equal(manifest.generatedAt, "2026-08-01T12:00:00.000Z");
    assert.equal(manifest.healthStatus, "healthy");
    assert.equal(manifest.retentionTier, "semester");
    assert.equal(manifest.retainUntil, "2026-12-31");
    assert.equal(manifest.shouldPersist, true);
    assert.equal(manifest.archiveKey.includes("weekly"), true);
  });

  it("keeps manual healthy snapshots non-persistent in the manifest", () => {
    const snapshot = buildOperationalSnapshot({
      profiles: [],
      generatedAt: new Date("2026-08-01T12:00:00Z"),
    });
    const archive = decideSnapshotArchive({
      snapshot,
      cadence: "manual",
      now: new Date("2026-08-01T12:00:00Z"),
    });

    const manifest = buildOperationalSnapshotManifest({ snapshot, archive });

    assert.equal(manifest.retentionTier, "founder_archive");
    assert.equal(manifest.shouldPersist, false);
  });
});
