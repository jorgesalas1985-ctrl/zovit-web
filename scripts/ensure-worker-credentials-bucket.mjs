/**
 * Crea el bucket worker-credentials y políticas mínimas vía SQL REST si es posible.
 * Uso: node scripts/ensure-worker-credentials-bucket.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const bucketId = "worker-credentials";

const { data: buckets, error: listError } = await admin.storage.listBuckets();
if (listError) {
  console.error("No se pudo listar buckets:", listError.message);
  process.exit(1);
}

const exists = (buckets ?? []).some((b) => b.id === bucketId || b.name === bucketId);
if (exists) {
  console.log(`Bucket "${bucketId}" ya existe.`);
} else {
  const { data, error } = await admin.storage.createBucket(bucketId, {
    public: false,
    fileSizeLimit: 10485760,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  });
  if (error) {
    console.error("No se pudo crear el bucket:", error.message);
    process.exit(1);
  }
  console.log(`Bucket creado:`, data ?? bucketId);
}

// Intentar aplicar políticas con rpc/sql no siempre está disponible.
// Verificamos subida de prueba con service role (bypass RLS).
const testPath = `_health/${Date.now()}.jpg`;
const jpegProbe = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);
const { error: uploadError } = await admin.storage
  .from(bucketId)
  .upload(testPath, jpegProbe, { contentType: "image/jpeg", upsert: true });

if (uploadError) {
  console.error("Bucket existe pero falló prueba de subida:", uploadError.message);
  process.exit(1);
}

await admin.storage.from(bucketId).remove([testPath]);
console.log("OK: bucket listo para almacenar documentos.");
console.log(
  "IMPORTANTE: si un usuario autenticado aún no puede subir, ejecuta en SQL Editor:\n  supabase/SPRINT_12_WORKER_AI_VALIDATION.sql"
);
