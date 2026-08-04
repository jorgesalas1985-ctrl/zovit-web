/**
 * Limpia registro de trabajador fantasma (fallback storage + metadata).
 * Uso: node scripts/clear-worker-registration.mjs <profile-uuid>
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const profileId = process.argv[2];
if (!profileId) {
  console.error("Uso: node scripts/clear-worker-registration.mjs <profile-uuid>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const folder = `${profileId}/registration`;
const draftPath = `${folder}/draft.json`;

console.log("Proyecto:", url);

const { data: listed } = await admin.storage.from("worker-credentials").list(folder);
console.log(
  "Archivos en registration:",
  (listed ?? []).map((f) => f.name),
);

const tombstone = JSON.stringify({
  deleted: true,
  updatedAt: new Date().toISOString(),
});

const { error: upError } = await admin.storage.from("worker-credentials").upload(draftPath, tombstone, {
  contentType: "application/json",
  upsert: true,
  cacheControl: "0",
});
console.log("Tombstone upload:", upError?.message ?? "ok");

const paths = [draftPath, ...((listed ?? []).map((f) => `${folder}/${f.name}`))];
const unique = [...new Set(paths)];
const { error: remError } = await admin.storage.from("worker-credentials").remove(unique);
console.log("Remove:", remError?.message ?? "ok");

// Deja tombstone final por si el remove no elimina (CDN/cache).
await admin.storage.from("worker-credentials").upload(draftPath, tombstone, {
  contentType: "application/json",
  upsert: true,
  cacheControl: "0",
});

const { data: authUser } = await admin.auth.admin.getUserById(profileId);
await admin.auth.admin.updateUserById(profileId, {
  user_metadata: {
    ...(authUser.user?.user_metadata ?? {}),
    worker_registration_status: null,
    worker_registration_updated_at: null,
    worker_registration_profiles: null,
  },
});

const { data: after, error: afterErr } = await admin.storage
  .from("worker-credentials")
  .download(draftPath);
if (after && !afterErr) {
  const text = await after.text();
  console.log("Draft actual:", text);
} else {
  console.log("Draft: eliminado");
}

const { data: afterAuth } = await admin.auth.admin.getUserById(profileId);
console.log(
  "Metadata status:",
  afterAuth.user?.user_metadata?.worker_registration_status ?? null,
);
console.log("OK");
