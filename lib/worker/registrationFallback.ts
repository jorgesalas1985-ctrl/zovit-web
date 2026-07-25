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
  const parsed = JSON.parse(text) as { draft?: WorkerRegistrationDraft; status?: string };
  if (!parsed.draft) return null;
  return { draft: parsed.draft, status: parsed.status ?? "draft" };
}
