import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { mapIdentityResubmissionRpcError } from "@/lib/verification/intranetIdentityResubmissionRpc";

const route = readFileSync(
  resolve(process.cwd(), "app/api/intranet/verification/[profileId]/request-resubmission/route.ts"),
  "utf8",
);

test("uses the session RPC and leaves every stateful write inside it", () => {
  assert.match(route, /getIntranetReviewer\(\)/);
  assert.match(route, /createClient\(\)[\s\S]*rpc\("intranet_request_identity_resubmission"/);
  assert.doesNotMatch(route, /createAdminClient/);
  assert.doesNotMatch(route, /\.from\("identity_documents"\)/);
  assert.doesNotMatch(route, /\.from\("profiles"\)/);
  assert.doesNotMatch(route, /\.from\("notifications"\)/);
});

test("maps an unauthorized RPC actor to the existing 403 response", () => {
  assert.deepEqual(mapIdentityResubmissionRpcError("Acceso no autorizado"), {
    status: 403,
    error: "Acceso no autorizado.",
  });
});

test("maps an invalid pending transition to 409 without a partial success response", () => {
  assert.deepEqual(mapIdentityResubmissionRpcError("La identidad ya no está pendiente de revisión"), {
    status: 409,
    error: "La identidad ya no está pendiente de revisión.",
  });
});

test("keeps foreign or duplicate documents behind the existing 400 public error", () => {
  for (const message of [
    "Uno o más documentos no pertenecen a esta identidad",
    "Los documentos solicitados no son válidos",
    "Perfil no encontrado",
  ]) {
    assert.deepEqual(mapIdentityResubmissionRpcError(message), {
      status: 400,
      error: "Uno o más documentos no pertenecen a esta identidad.",
    });
  }
});

test("keeps a missing single document behind its existing 404 public error", () => {
  assert.deepEqual(mapIdentityResubmissionRpcError("Uno o más documentos no pertenecen a esta identidad", "single"), {
    status: 404,
    error: "Documento no encontrado.",
  });
});

test("leaves unexpected RPC failures for the route's existing 500 handling", () => {
  assert.equal(mapIdentityResubmissionRpcError("Fallo de escritura"), null);
});
