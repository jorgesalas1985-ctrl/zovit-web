import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync("supabase/SPRINT_40_DOCUMENT_NOTIFICATION_IDEMPOTENCY.sql", "utf8");
const bridge = readFileSync("lib/operations/documentNotificationBridge.ts", "utf8");

test("unique delivery identity permits different events and recipients", () => {
  assert.match(sql, /primary key \(event_id, recipient_id, notification_kind\)/);
  assert.match(sql, /on conflict do nothing/);
  assert.match(sql, /insert into public\.notifications/);
});

test("bridge delegates concurrent retries to the atomic database operation", () => {
  assert.match(bridge, /rpc\(\s*"intranet_create_document_event_notification"/);
  assert.doesNotMatch(bridge, /notificationExists/);
  assert.doesNotMatch(bridge, /from\("notifications"\)\.insert/);
});
