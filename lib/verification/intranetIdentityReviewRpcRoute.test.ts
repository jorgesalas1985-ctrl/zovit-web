import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { mapIdentityReviewRpcError } from "@/lib/verification/intranetIdentityReviewRpc";

const route = readFileSync(resolve(process.cwd(), "app/api/intranet/verification/[profileId]/route.ts"), "utf8");

test("review route uses the session RPC without direct administrative writes", () => {
  assert.match(route, /getIntranetReviewer\(\)/);
  assert.match(route, /createClient\(\)[\s\S]*rpc\("intranet_review_identity_verification"/);
  assert.doesNotMatch(route, /createAdminClient|\.from\("profiles"\)|\.from\("identity_documents"\)/);
});

test("review RPC errors preserve authorization, conflict, and super-admin protection", () => {
  assert.deepEqual(mapIdentityReviewRpcError("Acceso no autorizado"), { status: 403, error: "Acceso no autorizado." });
  assert.deepEqual(mapIdentityReviewRpcError("Esta identidad ya fue aprobada, rechazada o no está pendiente de revisión"), { status: 409, error: "Esta identidad ya fue aprobada, rechazada o no está pendiente de revisión." });
  assert.deepEqual(mapIdentityReviewRpcError("No se puede rechazar la verificación del super administrador"), { status: 403, error: "No se puede rechazar la verificación del super administrador." });
});
