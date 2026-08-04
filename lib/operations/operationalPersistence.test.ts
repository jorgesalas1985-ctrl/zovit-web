import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOperationalSnapshotInsert,
  buildSemesterCloseRecordInsert,
} from "@/lib/operations/operationalPersistence";
import { buildCurrentSemesterClosePreview } from "@/lib/operations/currentSemesterClosePreview";
import { decideSnapshotArchive } from "@/lib/operations/snapshotArchivePolicy";
import type { ControlCenterProfileInput } from "@/lib/operations/controlCenterProfiles";

const profile: ControlCenterProfileInput = {
  id: "profile-1",
  first_name: "Perfil",
  last_name: "Operativo",
  role: "professional",
  intranet_role: null,
  identity_status: "approved",
  identity_verified: true,
  biometric_verified: true,
  worker_registration_status: "verified",
  primary_service_profile: null,
};

test("maps current snapshot preview to operational snapshot insert", () => {
  const preview = buildCurrentSemesterClosePreview({
    profiles: [profile],
    now: new Date("2026-12-20T12:00:00.000Z"),
    cadence: "semester_close",
  });
  const archive = decideSnapshotArchive({
    snapshot: preview.snapshot,
    cadence: "semester_close",
    now: new Date("2026-12-20T12:00:00.000Z"),
  });

  const insert = buildOperationalSnapshotInsert({
    snapshot: preview.snapshot,
    manifest: preview.manifest,
    archive,
    userId: "admin-1",
  });

  assert.equal(insert.schema_name, "zovit.operational_snapshot");
  assert.equal(insert.cadence, "semester_close");
  assert.equal(insert.created_by, "admin-1");
  assert.equal(insert.snapshot.generatedAt, "2026-12-20T12:00:00.000Z");
});

test("maps current close preview to semester close record insert", () => {
  const preview = buildCurrentSemesterClosePreview({
    profiles: [profile],
    now: new Date("2026-07-25T12:00:00.000Z"),
  });

  const insert = buildSemesterCloseRecordInsert({
    preview,
    snapshotId: "snapshot-1",
    userId: "admin-1",
  });

  assert.equal(insert.year, 2026);
  assert.equal(insert.semester, "S1");
  assert.equal(insert.snapshot_id, "snapshot-1");
  assert.equal(insert.created_by, "admin-1");
  assert.equal(insert.decision.status, "ready");
});
