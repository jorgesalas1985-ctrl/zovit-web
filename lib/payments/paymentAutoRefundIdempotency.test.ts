import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync("supabase/SPRINT_39_PAYMENT_AUTO_REFUND_IDEMPOTENCY.sql", "utf8");
const source = readFileSync("lib/payments/confirmPayment.ts", "utf8");

test("refund claims serialize concurrent webhooks and recover expired leases", () => {
  assert.match(sql, /payment_id uuid primary key/);
  assert.match(sql, /provider_payment_id text not null unique/);
  assert.match(sql, /idempotency_key text not null unique/);
  assert.match(sql, /status in \('claimed', 'submitted', 'completed', 'failed', 'uncertain'\)/);
  assert.match(sql, /lease_expires_at > now_ts/);
  assert.match(sql, /attempt_count = c\.attempt_count \+ 1/);
});

test("timeout and local completion recovery retain a single refund identity", () => {
  assert.match(source, /status = \/timeout\|timed out\|network\|fetch\/i\.test\(message\) \? "uncertain" : "failed"/);
  assert.match(sql, /where not exists \(select 1 from public\.payment_events where payment_id = claim_row\.payment_id and event_type = 'auto_refund_after_cancel'\)/);
  assert.match(sql, /if claim_row\.status = 'completed' then return/);
  assert.match(sql, /'zovit-refund-' \|\| p_payment_id::text/);
});

test("provider call is guarded by claim, submitted state and idempotent completion", () => {
  assert.ok(source.indexOf('rpc("intranet_claim_cancelled_payment_refund"') < source.indexOf("provider.refund(mpRef)"));
  assert.ok(source.indexOf('rpc("intranet_mark_cancelled_payment_refund_submitted"') < source.indexOf("provider.refund(mpRef)"));
  assert.ok(source.indexOf("provider.refund(mpRef)") < source.indexOf('rpc("intranet_complete_cancelled_payment_refund"'));
});
