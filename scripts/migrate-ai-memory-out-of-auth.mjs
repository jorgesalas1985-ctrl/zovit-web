import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltan las variables privadas de Supabase.");

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: profiles, error: profileError } = await admin
  .from("profiles")
  .select("id")
  .eq("intranet_role", "super_admin");
if (profileError) throw profileError;

let migrated = 0;
const diagnostics = [];
for (const profile of profiles ?? []) {
  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error) throw error;
  const meta = data.user?.user_metadata ?? {};
  diagnostics.push({
    userId: profile.id,
    userMetadataBytes: Buffer.byteLength(JSON.stringify(meta)),
    appMetadataBytes: Buffer.byteLength(JSON.stringify(data.user?.app_metadata ?? {})),
    largestFields: Object.entries(meta)
      .map(([field, value]) => ({ field, bytes: Buffer.byteLength(JSON.stringify(value)) }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10),
  });
  const hasLegacy = ["zovit_ai_messages", "zovit_ai_orders", "zovit_ai_history", "zovit_ai_training", "zovit_ai_training_history"]
    .some((field) => meta[field] != null);
  if (!hasLegacy) continue;
  const memory = {
    messages: meta.zovit_ai_messages ?? [],
    orders: meta.zovit_ai_orders ?? [],
    history: meta.zovit_ai_history ?? [],
    training: meta.zovit_ai_training ?? null,
    trainingHistory: meta.zovit_ai_training_history ?? [],
    migratedAt: new Date().toISOString(),
  };
  const path = `${profile.id}/zovit-ai/private-memory.json`;
  const { error: uploadError } = await admin.storage.from("worker-credentials").upload(path, JSON.stringify(memory), {
    contentType: "application/json", cacheControl: "0", upsert: true,
  });
  if (uploadError) throw uploadError;
  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, { user_metadata: {
    zovit_ai_messages: null,
    zovit_ai_orders: null,
    zovit_ai_history: null,
    zovit_ai_training: null,
    zovit_ai_training_history: null,
  } });
  if (updateError) throw updateError;
  migrated += 1;
}

console.log(`Memoria privada migrada para ${migrated} cuenta(s) de superadministración.`);
console.log(JSON.stringify(diagnostics, null, 2));
