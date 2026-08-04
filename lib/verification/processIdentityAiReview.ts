import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeCarnetWithOpenAI } from "@/lib/verification/aiCarnetOcr";
import { applyIdentityAiVerdict } from "@/lib/verification/applyIdentityAiVerdict";
import { isValidStoragePathForUser } from "@/lib/security/validation";

const MAX_BYTES = 4_500_000;

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

export async function processIdentityAiReview(profileId: string): Promise<{
  decision: "approved" | "rejected" | "dudoso";
  summary: string;
}> {
  const admin = createAdminClient();

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

  await admin
    .from("profiles")
    .update({
      identity_ai_status: "processing",
      identity_ai_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .eq("identity_status", "pending");

  const { data: documents, error: docsError } = await admin
    .from("identity_documents")
    .select("document_type,storage_path,status")
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
    const verdict = await analyzeCarnetWithOpenAI({
      declaredRut: profile.rut,
      declaredBirthDate: String(profile.birth_date),
      firstName: profile.first_name,
      lastName: profile.last_name,
      files,
    });

    const result = await applyIdentityAiVerdict({ admin, profileId, verdict });

    const { data: frontRow } = await admin
      .from("identity_documents")
      .select("metadata")
      .eq("profile_id", profileId)
      .eq("document_type", "cedula_front")
      .maybeSingle();

    const prevMeta =
      frontRow?.metadata && typeof frontRow.metadata === "object"
        ? (frontRow.metadata as Record<string, unknown>)
        : {};

    await admin
      .from("identity_documents")
      .update({
        metadata: {
          ...prevMeta,
          aiExtractedRut: verdict.extractedRut,
          aiExtractedBirthDate: verdict.extractedBirthDate,
          aiDecision: verdict.decision,
          aiConfidence: verdict.confidence,
          aiForgeryRisk: verdict.forgeryRisk,
          aiSummary: verdict.summary,
          aiReasons: verdict.reasons,
          aiModel: verdict.model,
          aiReviewedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", profileId)
      .eq("document_type", "cedula_front");

    return { decision: result.applied, summary: verdict.summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error IA carnet";
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

export async function processPendingIdentityAiReviews(
  limit = 10,
  options?: { includeDudosos?: boolean }
): Promise<{
  processed: number;
  approved: number;
  rejected: number;
  dudoso: number;
}> {
  const admin = createAdminClient();
  const filter = options?.includeDudosos
    ? "identity_ai_status.is.null,identity_ai_status.eq.pending,identity_ai_status.eq.dudoso,identity_ai_status.eq.processing"
    : "identity_ai_status.is.null,identity_ai_status.eq.pending,identity_ai_status.eq.processing";

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

  for (const row of rows ?? []) {
    const result = await processIdentityAiReview(row.id);
    if (result.decision === "approved") approved += 1;
    else if (result.decision === "rejected") rejected += 1;
    else dudoso += 1;
  }

  return {
    processed: (rows ?? []).length,
    approved,
    rejected,
    dudoso,
  };
}
