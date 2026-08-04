import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";

const BUCKET = "worker-credentials";

export function isMissingWorkerTableError(message?: string | null): boolean {
  return /worker_registrations|worker_credentials|schema cache|does not exist/i.test(
    message ?? ""
  );
}

export async function saveWorkerDraftFallback(
  admin: SupabaseClient,
  userId: string,
  draft: WorkerRegistrationDraft,
  status: string
) {
  const path = `${userId}/registration/draft.json`;
  const payload = JSON.stringify({
    draft,
    status,
    updatedAt: new Date().toISOString(),
  });

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, payload, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "0",
  });
  if (uploadError) throw uploadError;

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      worker_registration_status: status,
      worker_registration_updated_at: new Date().toISOString(),
      worker_registration_profiles: draft.suggestedProfiles,
    },
  });

  return { path, status };
}

export async function loadWorkerDraftFallback(
  admin: SupabaseClient,
  userId: string
): Promise<{ draft: WorkerRegistrationDraft; status: string } | null> {
  const path = `${userId}/registration/draft.json`;
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const text = await data.text();
  const parsed = JSON.parse(text) as {
    draft?: WorkerRegistrationDraft;
    status?: string;
    deleted?: boolean;
  };
  if (parsed.deleted || !parsed.draft) return null;
  return { draft: parsed.draft, status: parsed.status ?? "draft" };
}

/** Borra el borrador de respaldo para que el panel no muestre avisos fantasma. */
export async function clearWorkerDraftFallback(admin: SupabaseClient, userId: string) {
  const path = `${userId}/registration/draft.json`;
  await admin.storage.from(BUCKET).upload(
    path,
    JSON.stringify({ deleted: true, updatedAt: new Date().toISOString() }),
    { contentType: "application/json", upsert: true, cacheControl: "0" },
  );
  await admin.storage.from(BUCKET).remove([path]);
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      worker_registration_status: null,
      worker_registration_updated_at: null,
      worker_registration_profiles: null,
    },
  });
}
