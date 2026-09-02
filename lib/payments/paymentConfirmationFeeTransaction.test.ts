import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync("supabase/SPRINT_38_PAYMENT_RECEIVED_FEE_TRANSACTION.sql", "utf8");
const source = readFileSync("lib/payments/confirmPayment.ts", "utf8");

test("locks the payment and commits fee with the valid transition", () => {
  assert.match(sql, /for update/);
  assert.match(sql, /provider_processing_fee = coalesce/);
  assert.match(sql, /event_type, old_status, new_status, amount, metadata/);
  assert.ok(sql.indexOf("provider_processing_fee = coalesce") < sql.indexOf("insert into public.payment_events"));
});

test("keeps provider reference uniqueness and optional fees", () => {
  assert.match(sql, /provider_reference = p_provider_reference/);
  assert.match(sql, /p_provider_processing_fee numeric default null/);
  assert.match(sql, /coalesce\(p_provider_processing_fee, 0\) > 0/);
});

test("caller delegates the fee to the transaction with no post-RPC write", () => {
  assert.match(source, /p_provider_processing_fee: input\.mercadoPagoPayment\?\.provider_processing_fee \?\? null/);
  const afterRegistration = source.slice(source.indexOf('rpc("register_payment_received"'));
  assert.doesNotMatch(afterRegistration, /from\("payment_events"\)\.insert/);
  assert.doesNotMatch(source, /provider_processing_fee: mpFee/);
});
