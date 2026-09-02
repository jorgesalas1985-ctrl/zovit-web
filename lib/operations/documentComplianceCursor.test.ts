import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/SPRINT_46_DOCUMENT_COMPLIANCE_BATCH_CURSOR.sql", "utf8");
const dashboard = readFileSync("lib/operations/documentComplianceDashboard.ts", "utf8");
const reminder = readFileSync("lib/operations/documentRenewalReminderPreparation.ts", "utf8");
const suspension = readFileSync("lib/operations/documentSuspensionPreparation.ts", "utf8");
const cleanup = readFileSync("lib/operations/documentNotificationCleanupBatch.ts", "utf8");

test("uses a stable created_at plus id keyset with a bounded page", () => {
  assert.match(sql, /worker_registration_status, created_at, id/);
  assert.match(dashboard, /\.order\("created_at"/);
  assert.match(dashboard, /\.order\("id"/);
  assert.match(dashboard, /created_at\.gt/);
  assert.match(dashboard, /id\.gt/);
  assert.doesNotMatch(dashboard, /\.range\(/);
});

test("persists independent cursors for every automatic compliance batch", () => {
  assert.match(sql, /operational_batch_cursors/);
  assert.match(sql, /document_reminders/);
  assert.match(sql, /document_suspensions/);
  assert.match(sql, /document_notification_cleanup/);
  for (const source of [reminder, suspension, cleanup]) {
    assert.match(source, /getDocumentComplianceCursor/);
    assert.match(source, /advanceDocumentComplianceCursor/);
  }
});
