import { createAdminClient } from "@/lib/supabase/admin";
import { isValidStoragePathForUser } from "@/lib/security/validation";
import type { PendingVerificationUser } from "@/lib/verification/types";

export async function listPendingVerificationUsers(): Promise<PendingVerificationUser[]> {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id,first_name,last_name,rut,birth_date,birth_date_carnet_confirmed,role,intranet_role,identity_submitted_at,identity_ai_status,identity_ai_summary,identity_ai_confidence,identity_ai_forgery_risk,identity_ai_extracted_rut,identity_ai_extracted_birth_date",
    )
    .eq("identity_status", "pending")
    .order("identity_submitted_at", { ascending: true });

  if (error) throw error;

  // El super admin nunca aparece en la cola de rechazo/revisión.
  const reviewable = (profiles ?? []).filter((profile) => profile.intranet_role !== "super_admin");
  const profileIds = reviewable.map((profile) => profile.id);
  if (profileIds.length === 0) return [];

  const { data: documents, error: docsError } = await admin
    .from("identity_documents")
    .select("id,profile_id,document_type,storage_path,status,admin_notes,metadata,created_at,updated_at")
    .in("profile_id", profileIds);

  if (docsError) throw docsError;

  const docsByProfile = new Map<string, PendingVerificationUser["documents"]>();
  for (const doc of documents ?? []) {
    const current = docsByProfile.get(doc.profile_id) ?? [];
    current.push(doc);
    docsByProfile.set(doc.profile_id, current);
  }

  return reviewable.map((profile) => ({
    ...profile,
    documents: docsByProfile.get(profile.id) ?? [],
  }));
}

export async function getVerificationDocuments(profileId: string) {
  const admin = createAdminClient();
  const { data: documents, error } = await admin
    .from("identity_documents")
    .select("id,document_type,storage_path,status,metadata,created_at")
    .eq("profile_id", profileId);

  if (error) throw error;

  return Promise.all(
    (documents ?? [])
      .filter((doc) => isValidStoragePathForUser(doc.storage_path, profileId))
      .map(async (doc) => {
        const { data, error: signError } = await admin.storage
          .from("identity-documents")
          .createSignedUrl(doc.storage_path, 3600);
        return {
          ...doc,
          signedUrl: data?.signedUrl ?? null,
          signError: signError?.message ?? null,
          previewPath: `/api/intranet/verification/${profileId}/file/${doc.id}`,
        };
      })
  );
}
