import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { mapIdentityResubmissionRpcError } from "@/lib/verification/intranetIdentityResubmissionRpc";

const route = readFileSync(
  resolve(process.cwd(), "app/api/intranet/verification/[profileId]/document/[documentId]/request-resubmission/route.ts"),
  "utf8",
);
const rpc = readFileSync(
  resolve(process.cwd(), "supabase/SPRINT_31_INTRANET_IDENTITY_RESUBMISSION_RPC_RESULT.sql"),
  "utf8",
);

test("single resubmission uses the session RPC with only the target document id", () => {
  assert.match(route, /getIntranetReviewer\(\)/);
  assert.match(route, /createClient\(\)[\s\S]*rpc\("intranet_request_identity_resubmission"/);
  assert.match(route, /p_document_ids: \[documentId\]/);
  assert.doesNotMatch(route, /createAdminClient/);
  assert.doesNotMatch(route, /\.from\("identity_documents"\)/);
  assert.doesNotMatch(route, /\.from\("profiles"\)/);
  assert.doesNotMatch(route, /\.from\("notifications"\)/);
});

test("single resubmission preserves its 403, 404, and 409 error contracts", () => {
  assert.deepEqual(mapIdentityResubmissionRpcError("Acceso no autorizado", "single"), {
    status: 403,
    error: "Acceso no autorizado.",
  });
  assert.deepEqual(mapIdentityResubmissionRpcError("Uno o más documentos no pertenecen a esta identidad", "single"), {
    status: 404,
    error: "Documento no encontrado.",
  });
  assert.deepEqual(mapIdentityResubmissionRpcError("La identidad ya no está pendiente de revisión", "single"), {
    status: 409,
    error: "La identidad ya no está pendiente de revisión.",
  });
});

test("RPC preserves the singular notification and success label contract", () => {
  assert.match(rpc, /is_single_document := requested_document_count = 1/);
  assert.match(rpc, /then 'Debes reenviar un documento'/);
  assert.match(rpc, /reemplazarlo%s/);
  assert.match(rpc, /return document_labels/);
});
