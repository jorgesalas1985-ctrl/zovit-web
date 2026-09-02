import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync("supabase/SPRINT_43_DOCUMENT_LOCAL_OCR_CLAIM.sql", "utf8");
const batch = readFileSync("lib/operations/localOcrBatch.ts", "utf8");
const processor = readFileSync("lib/operations/localOcrProcessor.ts", "utf8");

test("local OCR claims serialize concurrent processors and recover expired leases", () => {
  assert.match(sql, /operational_document_ocr_claims/);
  assert.match(sql, /document_status not in \('submitted', 'ocr_pending'\)/);
  assert.match(sql, /prior_status = 'claimed' and prior_lease > now_ts/);
  assert.match(sql, /lease_expires_at = now_ts \+ interval '10 minutes'/);
});

test("only the active claim persists OCR state and its one result event", () => {
  assert.match(sql, /Claim OCR inválido o vencido/);
  assert.match(sql, /intranet_persist_local_ocr_result/);
  assert.match(sql, /operational_document_ocr_result_events/);
  assert.match(sql, /on conflict \(document_id\) do nothing/);
  assert.match(processor, /Se requiere un claim OCR activo/);
  assert.match(processor, /rpc\("intranet_persist_local_ocr_result"/);
});

test("batch claims a document before invoking local OCR", () => {
  assert.ok(batch.indexOf('rpc(\n      "intranet_claim_local_ocr_document"') < batch.indexOf("processDocument({"));
  assert.match(batch, /claimToken: claimToken as string/);
});
