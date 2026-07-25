import type { SupabaseClient } from "@supabase/supabase-js";
import { loadWorkerDraftFallback } from "@/lib/worker/registrationFallback";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";

const WORKER_BUCKET = "worker-credentials";
const IDENTITY_BUCKET = "identity-documents";

export type WorkerCertificateSource = {
  label: string;
  storagePath: string;
  mime?: string | null;
};

export async function listWorkerCertificateSources(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string
): Promise<WorkerCertificateSource[]> {
  const sources: WorkerCertificateSource[] = [];

  const { data: credentials, error: credentialsError } = await supabase
    .from("worker_credentials")
    .select("credential_name,storage_path,document_mime")
    .eq("profile_id", userId);

  if (!credentialsError) {
    for (const cred of credentials ?? []) {
      if (!cred.storage_path) continue;
      sources.push({
        label: cred.credential_name || "Certificado profesional",
        storagePath: cred.storage_path,
        mime: cred.document_mime,
      });
    }
  }

  const { data: registration, error: registrationError } = await supabase
    .from("worker_registrations")
    .select("draft")
    .eq("profile_id", userId)
    .maybeSingle();

  let draft = !registrationError
    ? (registration?.draft as WorkerRegistrationDraft | undefined)
    : undefined;
  if (!draft) {
    const fallback = await loadWorkerDraftFallback(admin, userId);
    draft = fallback?.draft;
  }

  if (draft?.credentials?.length) {
    for (const cred of draft.credentials) {
      if (!cred.storagePath) continue;
      if (sources.some((s) => s.storagePath === cred.storagePath)) continue;
      sources.push({
        label: cred.credentialName || cred.documentName || "Certificado profesional",
        storagePath: cred.storagePath,
        mime: cred.documentMime,
      });
    }
  }

  if (draft?.training?.enrollmentStoragePath) {
    const path = draft.training.enrollmentStoragePath;
    if (!sources.some((s) => s.storagePath === path)) {
      sources.push({
        label: draft.training.enrollmentDocName || "Certificado de alumno regular / matrícula",
        storagePath: path,
        mime: draft.training.enrollmentMime,
      });
    }
  }

  return sources;
}

function guessMime(path: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

export async function importWorkerCertificatesToStudyVerification(params: {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  userId: string;
  submit?: boolean;
}) {
  const { supabase, admin, userId } = params;
  const sources = await listWorkerCertificateSources(supabase, admin, userId);

  if (!sources.length) {
    return {
      ok: false as const,
      error: "No encontramos certificados en tu registro de trabajador. Súbelos allí con el botón +.",
    };
  }

  const { data: existing } = await supabase
    .from("identity_documents")
    .select("id,storage_path")
    .eq("profile_id", userId)
    .eq("document_type", "certificado_estudios");

  // Limpiar previos de este tipo para dejar una carga limpia desde el registro.
  for (const doc of existing ?? []) {
    if (doc.storage_path) {
      await admin.storage.from(IDENTITY_BUCKET).remove([doc.storage_path]);
    }
    await supabase.from("identity_documents").delete().eq("id", doc.id);
  }

  const imported: string[] = [];

  for (const source of sources) {
    const { data: file, error: downloadError } = await admin.storage
      .from(WORKER_BUCKET)
      .download(source.storagePath);

    if (downloadError || !file) continue;

    const extension = source.storagePath.split(".").pop()?.toLowerCase() || "bin";
    const mime = guessMime(source.storagePath, source.mime);
    const newPath = `${userId}/certificado_estudios/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from(IDENTITY_BUCKET).upload(newPath, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (uploadError) continue;

    const { error: rowError } = await supabase.from("identity_documents").insert({
      profile_id: userId,
      document_type: "certificado_estudios",
      storage_path: newPath,
      status: "uploaded",
      metadata: {
        source: "worker_registration",
        original_path: source.storagePath,
        label: source.label,
      },
    });

    if (!rowError) imported.push(source.label);
  }

  if (!imported.length) {
    return {
      ok: false as const,
      error: "No se pudieron importar los archivos del registro. Intenta subirlos de nuevo allí.",
    };
  }

  if (params.submit !== false) {
    const { error: submitError } = await supabase.rpc("submit_study_certificate_verification");
    if (submitError) {
      return {
        ok: true as const,
        imported,
        submitted: false,
        notice: `Documentos importados (${imported.length}), pero no se pudo enviar a revisión: ${submitError.message}`,
      };
    }
  }

  return {
    ok: true as const,
    imported,
    submitted: params.submit !== false,
    notice:
      params.submit === false
        ? `Se importaron ${imported.length} documento(s) desde tu registro de trabajador.`
        : `Se usaron ${imported.length} documento(s) de tu registro y se enviaron a verificación gratuita.`,
  };
}
