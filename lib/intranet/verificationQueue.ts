import { createAdminClient } from "@/lib/supabase/admin";
import { isValidStoragePathForUser } from "@/lib/security/validation";
import type { PendingVerificationUser } from "@/lib/verification/types";

const REQUIRED_BIOMETRIC_DOCUMENTS = new Set(["cedula_front", "cedula_back", "selfie", "liveness_proof"]);
const OCR_STALE_AFTER_MS = 2 * 60 * 1000;
const MANUAL_APPROVAL_NOTE = "Aprobado en revisión manual; carnet, selfie y prueba de vida corroborados visualmente.";

/**
 * Protege una aprobación manual ya terminada de procesos antiguos que puedan
 * dejar el perfil en pendiente después de haber aprobado todos sus documentos.
 * No aprueba documentos marcados uno a uno: exige la nota final que solo deja
 * la acción "Aprobar" de la revisión administrativa.
 */
async function repairCompletedManualApprovals() {
  const admin = createAdminClient();
  const { data: documents, error: documentsError } = await admin
    .from("identity_documents")
    .select("profile_id,document_type,status,admin_notes")
    .in("document_type", [...REQUIRED_BIOMETRIC_DOCUMENTS])
    .eq("status", "approved");
  if (documentsError) throw documentsError;

  const byProfile = new Map<string, Array<{ document_type: string; admin_notes: string | null }>>();
  for (const document of documents ?? []) {
    const current = byProfile.get(document.profile_id) ?? [];
    current.push(document);
    byProfile.set(document.profile_id, current);
  }

  const completedProfileIds = [...byProfile.entries()]
    .filter(([, profileDocuments]) => {
      const reviewedTypes = new Set(profileDocuments.map((document) => document.document_type));
      const hasEveryRequiredDocument = [...REQUIRED_BIOMETRIC_DOCUMENTS].every((type) => reviewedTypes.has(type));
      const hasFinalManualApproval = profileDocuments.some(
        (document) => document.admin_notes === MANUAL_APPROVAL_NOTE,
      );
      return hasEveryRequiredDocument && hasFinalManualApproval;
    })
    .map(([profileId]) => profileId);

  if (!completedProfileIds.length) return;
  const now = new Date().toISOString();
  const { error } = await admin
    .from("profiles")
    .update({
      identity_status: "approved",
      identity_verified: true,
      biometric_verified: true,
      identity_verified_at: now,
      identity_rejection_reason: null,
      birth_date_admin_corroborated: true,
      birth_date_admin_corroborated_at: now,
      identity_ai_status: "approved",
      identity_ai_summary: "Aprobación manual confirmada.",
      identity_ai_at: now,
      updated_at: now,
    })
    .in("id", completedProfileIds)
    .eq("identity_status", "pending");
  if (error) throw error;
}

/** Recupera trabajos OCR que quedaron interrumpidos para que pasen a revisión humana. */
async function recoverStaleOcrReviews() {
  const admin = createAdminClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - OCR_STALE_AFTER_MS).toISOString();
  const { error } = await admin
    .from("profiles")
    .update({
      identity_ai_status: "dudoso",
      identity_ai_summary: "El OCR no respondió dentro del tiempo máximo. Revisión manual requerida.",
      identity_ai_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("identity_status", "pending")
    .eq("identity_ai_status", "processing")
    .lt("identity_ai_at", cutoff);

  if (error) throw error;
}

/** Recupera solo registros antiguos que ya tienen los cuatro archivos biométricos cargados. */
async function reconcileUploadedBiometricProfiles() {
  const admin = createAdminClient();
  const { data: documents, error: documentsError } = await admin
    .from("identity_documents")
    .select("profile_id,document_type")
    .eq("status", "uploaded")
    .in("document_type", [...REQUIRED_BIOMETRIC_DOCUMENTS]);

  if (documentsError) throw documentsError;

  const byProfile = new Map<string, Set<string>>();
  for (const document of documents ?? []) {
    const types = byProfile.get(document.profile_id) ?? new Set<string>();
    types.add(document.document_type);
    byProfile.set(document.profile_id, types);
  }

  const candidates = [...byProfile.entries()]
    .filter(([, types]) => types.size === REQUIRED_BIOMETRIC_DOCUMENTS.size)
    .map(([profileId]) => profileId);
  if (!candidates.length) return;

  const now = new Date().toISOString();
  const { error } = await admin
    .from("profiles")
    .update({
      identity_status: "pending",
      identity_submitted_at: now,
      identity_rejection_reason: null,
      identity_ai_status: "pending",
      identity_ai_summary: "Documentos recuperados para revisión después del envío de registro.",
      updated_at: now,
    })
    .in("id", candidates)
    .eq("identity_status", "none");
  if (error) throw error;
}

export async function listPendingVerificationUsers(): Promise<PendingVerificationUser[]> {
  const admin = createAdminClient();
  await repairCompletedManualApprovals();
  await reconcileUploadedBiometricProfiles();
  await recoverStaleOcrReviews();
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

/** Historial de identidades aprobadas, tanto por OCR como por revisión manual. */
export async function listOcrCheckedVerificationUsers(): Promise<PendingVerificationUser[]> {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id,first_name,last_name,rut,birth_date,birth_date_carnet_confirmed,role,intranet_role,identity_submitted_at,identity_ai_status,identity_ai_summary,identity_ai_confidence,identity_ai_forgery_risk,identity_ai_extracted_rut,identity_ai_extracted_birth_date",
    )
    .eq("identity_status", "approved")
    .order("identity_verified_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const approvedProfiles = profiles ?? [];
  const profileIds = approvedProfiles.map((profile) => profile.id);
  if (!profileIds.length) return [];

  const { data: documents, error: documentsError } = await admin
    .from("identity_documents")
    .select("id,profile_id,document_type,storage_path,status,admin_notes,metadata,created_at,updated_at")
    .in("profile_id", profileIds);
  if (documentsError) throw documentsError;

  const docsByProfile = new Map<string, PendingVerificationUser["documents"]>();
  for (const document of documents ?? []) {
    const current = docsByProfile.get(document.profile_id) ?? [];
    current.push(document);
    docsByProfile.set(document.profile_id, current);
  }

  return approvedProfiles.map((profile) => ({ ...profile, documents: docsByProfile.get(profile.id) ?? [] }));
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
