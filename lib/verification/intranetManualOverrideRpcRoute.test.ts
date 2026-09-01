import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { mapManualOverrideRpcError } from "@/lib/verification/intranetManualOverrideRpc";

const route = readFileSync(
  resolve(process.cwd(), "app/api/intranet/verification/manual-override/route.ts"),
  "utf8",
);

test("manual-override route keeps session authentication and delegates all writes to its RPC", () => {
  assert.match(route, /createClient\(\)[\s\S]*auth\.getUser\(\)/);
  assert.match(route, /rpc\("intranet_manual_override_identity_verification"/);
  assert.doesNotMatch(route, /createAdminClient|\.from\("profiles"\)|\.from\("identity_documents"\)/);
});

test("manual-override RPC errors preserve public authorization and validation contracts", () => {
  assert.deepEqual(mapManualOverrideRpcError("Acceso no autorizado"), {
    status: 403,
    error: "Solo el superadministrador puede aprobar sin verificación.",
  });
  assert.deepEqual(mapManualOverrideRpcError("No se encontró la cuenta"), {
    status: 404,
    error: "No se encontró la cuenta.",
  });
  assert.deepEqual(mapManualOverrideRpcError("La cuenta protegida del superadministrador no usa esta excepción"), {
    status: 400,
    error: "La cuenta protegida del superadministrador no usa esta excepción.",
  });
  assert.deepEqual(mapManualOverrideRpcError("La identidad debe estar pendiente para usar esta excepción"), {
    status: 409,
    error: "La identidad debe estar pendiente para usar esta excepción.",
  });
  assert.deepEqual(mapManualOverrideRpcError("Confirmación de seguridad incorrecta"), {
    status: 400,
    error: "Confirmación de seguridad incorrecta.",
  });
  assert.equal(mapManualOverrideRpcError("Fallo de escritura"), null);
});
