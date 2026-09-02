import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync("supabase/SPRINT_44_SEMESTER_DOCUMENT_EVENTS_IDEMPOTENCY.sql", "utf8");
const reminder = readFileSync("lib/operations/documentRenewalReminderPreparation.ts", "utf8");
const suspension = readFileSync("lib/operations/documentSuspensionPreparation.ts", "utf8");

test("semester event identity is unique by profile, type, year and semester", () => {
  assert.match(sql, /primary key \(profile_id, event_type, semester_year, semester\)/);
  assert.match(sql, /on conflict \(profile_id, event_type, semester_year, semester\) do nothing/);
  assert.match(sql, /intranet_create_semester_document_event/);
});

test("reminders and suspensions use the atomic idempotent RPC", () => {
  assert.match(reminder, /rpc\("intranet_create_semester_document_event"/);
  assert.match(suspension, /rpc\("intranet_create_semester_document_event"/);
  assert.doesNotMatch(reminder, /loadExistingReminderEvents/);
  assert.doesNotMatch(suspension, /loadExistingSuspensionEvents/);
});
