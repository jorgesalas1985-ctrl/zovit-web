import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDocumentSemesterCompliance } from "@/lib/operations/documentSemesterCompliance";

test("opens current semester compliance when required documents are missing", () => {
  const compliance = evaluateDocumentSemesterCompliance({
    documents: [],
    requiredKinds: ["identity", "credential"],
    now: new Date("2026-08-10T12:00:00"),
  });

  assert.equal(compliance.status, "open");
  assert.equal(compliance.period.code, "S2");
  assert.deepEqual(compliance.missingKinds, ["identity", "credential"]);
  assert.equal(compliance.shouldSuspend, false);
});

test("warns when missing documents are near semester deadline", () => {
  const compliance = evaluateDocumentSemesterCompliance({
    documents: [],
    requiredKinds: ["identity"],
    reminderDaysBeforeDeadline: 30,
    now: new Date("2026-12-10T12:00:00"),
  });

  assert.equal(compliance.status, "due_soon");
  assert.equal(compliance.reasons.includes("required_documents_due_soon"), true);
});

test("marks account ready for suspension after previous S2 deadline", () => {
  const compliance = evaluateDocumentSemesterCompliance({
    documents: [],
    requiredKinds: ["identity"],
    now: new Date("2027-01-10T12:00:00"),
  });

  assert.equal(compliance.period.year, 2026);
  assert.equal(compliance.period.code, "S2");
  assert.equal(compliance.status, "suspension_ready");
  assert.equal(compliance.shouldSuspend, true);
  assert.equal(compliance.reasons.includes("deadline_passed"), true);
});

test("keeps compliance complete in January when previous S2 was approved", () => {
  const compliance = evaluateDocumentSemesterCompliance({
    documents: [
      {
        documentId: "doc-1",
        documentKind: "identity",
        status: "approved",
        semesterYear: 2026,
        semester: "S2",
      },
    ],
    requiredKinds: ["identity"],
    now: new Date("2027-01-10T12:00:00"),
  });

  assert.equal(compliance.status, "complete");
  assert.equal(compliance.shouldSuspend, false);
});

test("routes submitted documents to manual review state", () => {
  const compliance = evaluateDocumentSemesterCompliance({
    documents: [
      {
        documentId: "doc-1",
        documentKind: "credential",
        status: "ocr_pending",
        semesterYear: 2026,
        semester: "S2",
      },
    ],
    requiredKinds: ["credential"],
    now: new Date("2026-09-10T12:00:00"),
  });

  assert.equal(compliance.status, "pending_review");
  assert.equal(compliance.requiresManualReview, true);
  assert.deepEqual(compliance.pendingKinds, ["credential"]);
});
