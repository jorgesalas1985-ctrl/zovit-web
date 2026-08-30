import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "worker-credentials";
const memoryPath = (userId: string) => `${userId}/zovit-ai/private-memory.json`;

export type AiPrivateMemory = {
  messages?: unknown[];
  orders?: unknown[];
  history?: unknown[];
  training?: unknown;
  trainingHistory?: unknown[];
};

export async function loadAiPrivateMemory(userId: string): Promise<AiPrivateMemory> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).download(memoryPath(userId));
  if (data) {
    try { return JSON.parse(await data.text()) as AiPrivateMemory; } catch { /* migrate below */ }
  }
  const { data: authData, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  const meta = authData.user?.user_metadata ?? {};
  const migrated: AiPrivateMemory = {
    messages: meta.zovit_ai_messages ?? [], orders: meta.zovit_ai_orders ?? [], history: meta.zovit_ai_history ?? [],
    training: meta.zovit_ai_training ?? null, trainingHistory: meta.zovit_ai_training_history ?? [],
  };
  await saveAiPrivateMemory(userId, migrated);
  await admin.auth.admin.updateUserById(userId, { user_metadata: {
    ...meta,
    zovit_ai_messages: null, zovit_ai_orders: null, zovit_ai_history: null,
    zovit_ai_training: null, zovit_ai_training_history: null,
  } });
  return migrated;
}

export async function saveAiPrivateMemory(userId: string, memory: AiPrivateMemory) {
  const payload = JSON.stringify({ ...memory, updatedAt: new Date().toISOString() });
  const { error } = await createAdminClient().storage.from(BUCKET).upload(memoryPath(userId), payload, {
    contentType: "application/json", cacheControl: "0", upsert: true,
  });
  if (error) throw error;
}
