import { createAdminClient } from "@/lib/supabase/admin";
import { isValidStoragePathForUser } from "@/lib/security/validation";
import {
  analyzeWorkerDocumentsWithOpenAI,
  type AiDocumentInput,
} from "@/lib/worker/aiDocumentValidation";
import { applyAiVerdict } from "@/lib/worker/applyAiVerdict";
import type { ServiceProfileType, WorkerRegistrationDraft } from "@/lib/worker/types";

const WORKER_BUCKET = "worker-credentials";
const MAX_FILE_BYTES = 4_500_000;
const SYSTEM_ACTOR = "00000000-0000-0000-0000-000000000000";

async function loadFileBase64(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
): Promise<{ mime: string; base64: string } | null> {
  const { data, error } = await admin.storage.from(WORKER_BUCKET).download(path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) return null;
  const mime = data.type || guessMime(path);
  return { mime, base64: buffer.toString("base64") };
}

function guessMime(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

export async function processWorkerAiReview(profileId: string): Promise<{
  decision: string;
  confidence: number;
  forgeryRisk: string;
  summary: string;
}> {
  const admin = createAdminClient();

  const { data: reg, error } = await admin
    .from("worker_registrations")
    .select("profile_id,draft,suggested_profiles,status,ai_review_status")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !reg) {
    throw new Error(error?.message ?? "Registro de trabajador no encontrado.");
  }

  if (reg.status !== "submitted") {
    return {
      decision: "dudoso",
      confidence: 0,
      forgeryRisk: "medium",
      summary: `Estado ${reg.status}: solo se procesan enviados.`,
    };
  }

  await admin
    .from("worker_registrations")
    .update({
      ai_review_status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  const [{ data: profile }, { data: credentials }] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name,last_name,rut,primary_service_profile")
      .eq("id", profileId)
      .maybeSingle(),
    admin.from("worker_credentials").select("*").eq("profile_id", profileId),
  ]);

  const draft = (reg.draft ?? {}) as WorkerRegistrationDraft;
  const files: AiDocumentInput["files"] = [];

  for (const cred of credentials ?? []) {
    if (!isValidStoragePathForUser(cred.storage_path, profileId)) continue;
    const loaded = await loadFileBase64(admin, cred.storage_path);
    if (!loaded?.mime.startsWith("image/")) continue;
    files.push({
      label: `${cred.credential_name || "credencial"} (${cred.id})`,
      mime: loaded.mime,
      base64: loaded.base64,
    });
  }

  const enrollmentPath = draft.training?.enrollmentStoragePath;
  if (isValidStoragePathForUser(enrollmentPath, profileId)) {
    const loaded = await loadFileBase64(admin, enrollmentPath);
    if (loaded?.mime.startsWith("image/")) {
      files.push({
        label: "Matrícula / alumno regular",
        mime: loaded.mime,
        base64: loaded.base64,
      });
    }
  }

  const input: AiDocumentInput = {
    profile: {
      firstName: profile?.first_name ?? draft.personal?.firstName ?? "",
      lastName: profile?.last_name ?? draft.personal?.lastName ?? "",
      rut: profile?.rut ?? draft.personal?.rut ?? null,
    },
    credentials: (credentials ?? []).map((c) => ({
      id: c.id,
      profession: c.profession,
      institution: c.institution,
      credentialName: c.credential_name,
      yearObtained: c.year_obtained,
      registryNumber: c.registry_number,
      expiresAt: c.expires_at,
      storagePath: c.storage_path,
      documentMime: c.document_mime ?? null,
    })),
    draftSummary: {
      suggestedProfiles: (reg.suggested_profiles as string[]) ?? draft.suggestedProfiles ?? [],
      experienceTrade: draft.experience?.trade,
      trainingInstitution: draft.training?.institution,
      trainingCareer: draft.training?.career,
      enrollmentStoragePath: draft.training?.enrollmentStoragePath,
      enrollmentDocName: draft.training?.enrollmentDocName,
    },
    files,
  };

  const hasAnyStoredDoc =
    (credentials ?? []).some((c) => Boolean(c.storage_path)) || Boolean(enrollmentPath);

  let verdict = await analyzeWorkerDocumentsWithOpenAI(input);

  if (!input.files.length && hasAnyStoredDoc) {
    verdict = {
      ...verdict,
      decision: "dudoso",
      summary: `${verdict.summary} Documentos sin preview visual; queda en revisión dudosa.`,
      forgeryRisk: verdict.forgeryRisk === "low" ? "medium" : verdict.forgeryRisk,
    };
  }

  const primary =
    (profile?.primary_service_profile as ServiceProfileType | null) ??
    (draft.primaryProfile as ServiceProfileType | null) ??
    ((reg.suggested_profiles as ServiceProfileType[] | null)?.[0] ?? null);

  // actorId: usa el propio perfil si el UUID sistema no existe en FK.
  const actorId = profileId || SYSTEM_ACTOR;

  await applyAiVerdict({
    supabase: admin,
    profileId,
    actorId,
    verdict,
    primaryProfile: primary,
  });

  return {
    decision: verdict.decision,
    confidence: verdict.confidence,
    forgeryRisk: verdict.forgeryRisk,
    summary: verdict.summary,
  };
}

export async function processPendingWorkerAiReviews(
  limit = 8,
  options?: { includeDudosos?: boolean; profileIds?: string[] },
): Promise<{
  processed: number;
  approved: number;
  rejected: number;
  dudosos: number;
}> {
  const { isAiConfigured } = await import("@/lib/ai/provider");
  if (!isAiConfigured()) {
    return { processed: 0, approved: 0, rejected: 0, dudosos: 0 };
  }

  const admin = createAdminClient();
  let query = admin
    .from("worker_registrations")
    .select("profile_id")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(limit);

  if (options?.profileIds?.length) {
    query = admin
      .from("worker_registrations")
      .select("profile_id")
      .in("profile_id", options.profileIds)
      .limit(limit);
  } else if (options?.includeDudosos) {
    query = query.or(
      "ai_review_status.is.null,ai_review_status.eq.pending,ai_review_status.eq.dudoso,ai_review_status.eq.processing",
    );
  } else {
    query = query.or(
      "ai_review_status.is.null,ai_review_status.eq.pending,ai_review_status.eq.processing",
    );
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  let approved = 0;
  let rejected = 0;
  let dudosos = 0;

  for (const row of rows ?? []) {
    try {
      const result = await processWorkerAiReview(row.profile_id);
      if (result.decision === "approved") approved += 1;
      else if (result.decision === "rejected") rejected += 1;
      else dudosos += 1;
    } catch {
      dudosos += 1;
    }
  }

  return {
    processed: (rows ?? []).length,
    approved,
    rejected,
    dudosos,
  };
}
