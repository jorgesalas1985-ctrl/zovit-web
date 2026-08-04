import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOperationalDocumentEventInsert,
  buildOperationalDocumentInsert,
} from "@/lib/operations/documentRenewalPersistence";

test("builds operational document insert for active semester", () => {
  const insert = buildOperationalDocumentInsert({
    profileId: "profile-1",
    documentKind: "credential",
    bucket: "worker-credentials",
    path: "profile-1/docs/file.pdf",
    originalName: "titulo.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 1234,
    now: new Date("2026-08-10T12:00:00.000Z"),
  });

  assert.equal(insert.profile_id, "profile-1");
  assert.equal(insert.semester_year, 2026);
  assert.equal(insert.semester, "S2");
  assert.equal(insert.status, "submitted");
  assert.equal(insert.validation_summary.requiresOcr, true);
});

test("uses previous second semester outside operational period", () => {
  const event = buildOperationalDocumentEventInsert({
    profileId: "profile-1",
    eventType: "ocr_requested",
    now: new Date("2027-01-10T12:00:00.000Z"),
  });

  assert.equal(event.semester_year, 2026);
  assert.equal(event.semester, "S2");
  assert.equal(event.summary, "OCR local solicitado para documento.");
});
