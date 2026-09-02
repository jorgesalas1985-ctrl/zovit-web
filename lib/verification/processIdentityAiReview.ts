import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeCarnetWithOpenAI } from "@/lib/verification/aiCarnetOcr";
import { applyIdentityAiVerdict, type IdentityAiDocumentMetadata, type IdentityAiVerdictActor } from "@/lib/verification/applyIdentityAiVerdict";
import { isValidStoragePathForUser } from "@/lib/security/validation";

const MAX_BYTES = 4_500_000;
const OCR_TIMEOUT_MS = 45_000;

export type HumanIdentityAiVerdictActor = { kind: "human"; supabase: SupabaseClient };

function automationVerdictActor(admin: ReturnType<typeof createAdminClient>): IdentityAiVerdictActor {
  const automationSecret = process.env.ZOVIT_AI_AUTOMATION_RPC_SECRET?.trim();
  if (!automationSecret) throw new Error("La persistencia automática de identidad no está configurada.");
  return { kind: "automation", supabase: admin, automationSecret };
}

/** Evita que una imagen dañada o un worker OCR detenido deje la cuenta bloqueada indefinidamente. */
async function withOcrTimeout<T>(work: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("El OCR excedió el tiempo máximo. Se envió a revisión manual.")),
          OCR_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function downloadIdentityFile(
  admin: ReturnType<typeof createAdminClient>,
  storagePath: string
): Promise<{ mime: string; base64: string } | null> {
  const { data, error } = await admin.storage.from("identity-documents").download(storagePath);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;
  const mime = data.type || "image/jpeg";
  return { mime, base64: buffer.toString("base64") };
}

export async function processIdentityAiReview(
  profileId: string,
  actor?: HumanIdentityAiVerdictActor,
  claimToken?: string,
): Promise<{
  decision: "approved" | "rejected" | "dudoso";
  summary: string;
}> {
  const admin = createAdminClient();
  const verdictActor = actor ?? automationVerdictActor(admin);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,first_name,last_name,rut,birth_date,identity_status")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Perfil no encontrado.");
  }

  if (profile.identity_status !== "pending") {
    return {
      decision: "dudoso",
      summary: `Estado actual: ${profile.identity_status}. Solo se procesan pendientes.`,
    };
  }

  if (!profile.rut || !profile.birth_date) {
    if (claimToken && verdictActor.kind === "automation") {
      await failAutomatedIdentityClaim(verdictActor, profileId, claimToken, "Falta RUT o fecha de nacimiento declarada.");
      return { decision: "dudoso", summary: "Falta RUT o fecha de nacimiento." };
    }
    await admin
      .from("profiles")
      .update({
        identity_ai_status: "dudoso",
        identity_ai_summary: "Falta RUT o fecha de nacimiento declarada.",
        identity_ai_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
    return { decision: "dudoso", summary: "Falta RUT o fecha de nacimiento." };
  }

  if (!claimToken) {
    await admin
      .from("profiles")
      .update({
        identity_ai_status: "processing",
        identity_ai_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .eq("identity_status", "pending");
  }

  const { data: documents, error: docsError } = await admin
    .from("identity_documents")
    .select("id,document_type,storage_path,status,metadata")
    .eq("profile_id", profileId)
    .in("document_type", ["cedula_front", "cedula_back"])
    .in("status", ["uploaded", "approved"]);

  if (docsError) throw new Error(docsError.message);

  const files: Array<{ label: string; mime: string; base64: string }> = [];
  for (const doc of documents ?? []) {
    if (!isValidStoragePathForUser(doc.storage_path, profileId)) {
      continue;
    }

    const downloaded = await downloadIdentityFile(admin, doc.storage_path);
    if (!downloaded) continue;
    files.push({
      label: doc.document_type,
      mime: downloaded.mime,
      base64: downloaded.base64,
    });
  }

  try {
    const verdict = await withOcrTimeout(analyzeCarnetWithOpenAI({
      declaredRut: profile.rut,
      declaredBirthDate: String(profile.birth_date),
      firstName: profile.first_name,
      lastName: profile.last_name,
      files,
    }));

    const reviewedAt = new Date().toISOString();
    const documentMetadata: IdentityAiDocumentMetadata = {};
    for (const document of documents ?? []) {
      const previousMetadata =
        document.metadata && typeof document.metadata === "object"
          ? (document.metadata as Record<string, unknown>)
          : {};
      const documentAssessment = verdict.documentAssessments.find(
        (assessment) => assessment.label === document.document_type,
      );
      const frontMetadata = document.document_type === "cedula_front"
        ? {
            aiExtractedRut: verdict.extractedRut,
            aiExtractedBirthDate: verdict.extractedBirthDate,
            aiExtractedExpiryDate: verdict.extractedExpiryDate,
            aiNameMatches: verdict.nameMatches,
            aiCarnetExpired: verdict.carnetExpired,
            aiFaceReviewRequired: verdict.faceReviewRequired,
            aiDecision: verdict.decision,
            aiConfidence: verdict.confidence,
            aiForgeryRisk: verdict.forgeryRisk,
            aiSummary: verdict.summary,
            aiReasons: verdict.reasons,
            aiModel: verdict.model,
          }
        : {};

      documentMetadata[document.id] = {
        ...previousMetadata,
        ...frontMetadata,
        aiDocumentLooksLikeChileanId: documentAssessment?.looksLikeChileanId ?? false,
        aiDocumentConfidence: documentAssessment?.confidence ?? 0,
        aiDocumentReasons: documentAssessment?.reasons ?? ["OCR no pudo evaluar el documento"],
        aiReviewedAt: reviewedAt,
      };
    }
    const result = await applyIdentityAiVerdict({
      actor: verdictActor,
      profileId,
      verdict,
      claimToken,
      documentMetadata,
    });
    if (!claimToken) {
      await persistDocumentMetadata(admin, profileId, documentMetadata, reviewedAt);
    }

    return { decision: result.applied, summary: verdict.summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error IA carnet";
    if (claimToken && verdictActor.kind === "automation") {
      await failAutomatedIdentityClaim(verdictActor, profileId, claimToken, message);
      return { decision: "dudoso", summary: message };
    }
    await admin
      .from("profiles")
      .update({
        identity_ai_status: "dudoso",
        identity_ai_summary: message.slice(0, 500),
        identity_ai_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .eq("identity_status", "pending");
    return { decision: "dudoso", summary: message };
  }
}

async function persistDocumentMetadata(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  metadata: IdentityAiDocumentMetadata,
  reviewedAt: string,
) {
  await Promise.all(Object.entries(metadata).map(async ([documentId, value]) => {
    const { error } = await admin.from("identity_documents")
      .update({ metadata: value, updated_at: reviewedAt })
      .eq("id", documentId)
      .eq("profile_id", profileId);
    if (error) throw error;
  }));
}

async function failAutomatedIdentityClaim(
  actor: Extract<IdentityAiVerdictActor, { kind: "automation" }>,
  profileId: string,
  claimToken: string,
  summary: string,
) {
  const { error } = await actor.supabase.rpc("intranet_fail_identity_ai_review_claim", {
    p_profile_id: profileId,
    p_claim_token: claimToken,
    p_summary: summary,
    p_automation_secret: actor.automationSecret,
  });
  if (error) throw error;
}

export async function processPendingIdentityAiReviews(
  limit = 10,
  options?: { includeDudosos?: boolean },
  actor?: HumanIdentityAiVerdictActor,
): Promise<{
  processed: number;
  approved: number;
  rejected: number;
  dudoso: number;
}> {
  const admin = createAdminClient();
  // Un proceso que ya está activo no se vuelve a ejecutar en paralelo. Los casos
  // detenidos se recuperan como "dudoso" en la cola de administración.
  const filter = options?.includeDudosos
    ? "identity_ai_status.is.null,identity_ai_status.eq.pending,identity_ai_status.eq.dudoso"
    : "identity_ai_status.is.null,identity_ai_status.eq.pending";

  const { data: rows, error } = await admin
    .from("profiles")
    .select("id")
    .eq("identity_status", "pending")
    .or(filter)
    .order("identity_submitted_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  let approved = 0;
  let rejected = 0;
  let dudoso = 0;

  let processed = 0;
  for (const row of rows ?? []) {
    let claimToken: string | undefined;
    if (!actor) {
      const { data, error: claimError } = await admin.rpc("intranet_claim_identity_ai_review", {
        p_profile_id: row.id,
        p_include_dudosos: Boolean(options?.includeDudosos),
      });
      if (claimError || !data) continue;
      claimToken = data as string;
    }
    const result = await processIdentityAiReview(row.id, actor, claimToken);
    processed += 1;
    if (result.decision === "approved") approved += 1;
    else if (result.decision === "rejected") rejected += 1;
    else dudoso += 1;
  }

  return {
    processed,
    approved,
    rejected,
    dudoso,
  };
}
