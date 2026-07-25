import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import {
  analyzeWorkerDocumentsWithOpenAI,
  type AiDocumentInput,
} from "@/lib/worker/aiDocumentValidation";
import { applyAiVerdict } from "@/lib/worker/applyAiVerdict";
import type { ServiceProfileType, WorkerRegistrationDraft } from "@/lib/worker/types";

const WORKER_BUCKET = "worker-credentials";
const BATCH_DEFAULT = 8;
const BATCH_MAX = 20;
const MAX_FILE_BYTES = 4_500_000;

async function requireHrReviewer() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  if (!role || !["hr_admin", "super_admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  return { supabase, user: authData.user, role };
}

async function loadFileBase64(
  admin: ReturnType<typeof createAdminClient>,
  path: string
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

export async function GET() {
  try {
    const auth = await requireHrReviewer();
    if ("error" in auth) return auth.error;

    const { data, error } = await auth.supabase
      .from("worker_registrations")
      .select("profile_id,status,ai_review_status,ai_confidence,ai_forgery_risk,submitted_at")
      .eq("status", "submitted")
      .or("ai_review_status.is.null,ai_review_status.eq.pending,ai_review_status.eq.dudoso");

    if (error) {
      const missing = /ai_review_status|schema cache|does not exist/i.test(error.message);
      return NextResponse.json(
        {
          error: missing
            ? "Falta aplicar supabase/SPRINT_12_WORKER_AI_VALIDATION.sql en Supabase."
            : error.message,
          code: missing ? "MIGRATION_REQUIRED" : "QUERY_ERROR",
        },
        { status: 400 }
      );
    }

    const rows = data ?? [];
    return NextResponse.json({
      pending: rows.filter((r) => r.ai_review_status !== "dudoso").length,
      dudosos: rows.filter((r) => r.ai_review_status === "dudoso").length,
      queue: rows,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireHrReviewer();
    if ("error" in auth) return auth.error;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Falta OPENAI_API_KEY en el entorno del servidor (Vercel → Settings → Environment Variables).",
          code: "OPENAI_MISSING",
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
      includeDudosos?: boolean;
      profileIds?: string[];
    };

    const limit = Math.min(BATCH_MAX, Math.max(1, Number(body.limit) || BATCH_DEFAULT));
    const admin = createAdminClient();

    let query = auth.supabase
      .from("worker_registrations")
      .select("profile_id,draft,suggested_profiles,status,ai_review_status")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true })
      .limit(limit);

    if (body.profileIds?.length) {
      query = auth.supabase
        .from("worker_registrations")
        .select("profile_id,draft,suggested_profiles,status,ai_review_status")
        .in("profile_id", body.profileIds)
        .limit(limit);
    } else if (body.includeDudosos) {
      query = query.or(
        "ai_review_status.is.null,ai_review_status.eq.pending,ai_review_status.eq.dudoso"
      );
    } else {
      query = query.or("ai_review_status.is.null,ai_review_status.eq.pending");
    }

    const { data: registrations, error } = await query;
    if (error) {
      const missing = /ai_review_status|schema cache|does not exist/i.test(error.message);
      return NextResponse.json(
        {
          error: missing
            ? "Falta aplicar supabase/SPRINT_12_WORKER_AI_VALIDATION.sql en Supabase."
            : error.message,
          code: missing ? "MIGRATION_REQUIRED" : "QUERY_ERROR",
        },
        { status: 400 }
      );
    }

    const results: Array<{
      profileId: string;
      decision: string;
      confidence: number;
      forgeryRisk: string;
      summary: string;
      error?: string;
    }> = [];

    for (const reg of registrations ?? []) {
      const profileId = reg.profile_id as string;
      try {
        await auth.supabase
          .from("worker_registrations")
          .update({
            ai_review_status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", profileId);

        const [{ data: profile }, { data: credentials }] = await Promise.all([
          auth.supabase
            .from("profiles")
            .select("first_name,last_name,rut,primary_service_profile")
            .eq("id", profileId)
            .maybeSingle(),
          auth.supabase.from("worker_credentials").select("*").eq("profile_id", profileId),
        ]);

        const draft = (reg.draft ?? {}) as WorkerRegistrationDraft;
        const files: AiDocumentInput["files"] = [];

        for (const cred of credentials ?? []) {
          if (!cred.storage_path) continue;
          const loaded = await loadFileBase64(admin, cred.storage_path);
          if (!loaded) continue;
          if (loaded.mime.startsWith("image/")) {
            files.push({
              label: `${cred.credential_name || "credencial"} (${cred.id})`,
              mime: loaded.mime,
              base64: loaded.base64,
            });
          } else if (loaded.mime === "application/pdf") {
            // PDFs: se envían metadatos; visión prioriza imágenes. Marcamos en label.
            files.push({
              label: `PDF:${cred.credential_name || "credencial"} (${cred.id})`,
              mime: loaded.mime,
              base64: loaded.base64.slice(0, 80), // placeholder; análisis visual limitado
            });
          }
        }

        const enrollmentPath = draft.training?.enrollmentStoragePath;
        if (enrollmentPath) {
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
          files: files.filter((f) => f.mime.startsWith("image/")),
        };

        // Si solo hay PDFs, aún llamamos con hasDocuments=false en files vacíos → dudoso;
        // mejor: si hay storage_path PDF, forzar análisis metadata-aware.
        const hasAnyStoredDoc =
          (credentials ?? []).some((c) => Boolean(c.storage_path)) || Boolean(enrollmentPath);

        let verdict = await analyzeWorkerDocumentsWithOpenAI(input);

        if (!input.files.length && hasAnyStoredDoc) {
          verdict = {
            ...verdict,
            decision: verdict.decision === "approved" ? "dudoso" : verdict.decision,
            summary: `${verdict.summary} Documentos en PDF sin preview visual automática; se dejó en cola dudosa o rechazo según señales.`,
            forgeryRisk: verdict.forgeryRisk === "low" ? "medium" : verdict.forgeryRisk,
          };
          if (verdict.decision === "approved") verdict.decision = "dudoso";
        }

        const primary =
          (profile?.primary_service_profile as ServiceProfileType | null) ??
          (draft.primaryProfile as ServiceProfileType | null) ??
          ((reg.suggested_profiles as ServiceProfileType[] | null)?.[0] ?? null);

        await applyAiVerdict({
          supabase: auth.supabase,
          profileId,
          actorId: auth.user.id,
          verdict,
          primaryProfile: primary,
        });

        results.push({
          profileId,
          decision: verdict.decision,
          confidence: verdict.confidence,
          forgeryRisk: verdict.forgeryRisk,
          summary: verdict.summary,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al validar";
        await auth.supabase
          .from("worker_registrations")
          .update({
            ai_review_status: "dudoso",
            ai_review_summary: message,
            ai_review_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", profileId);

        await auth.supabase.from("worker_review_history").insert({
          profile_id: profileId,
          actor_id: auth.user.id,
          action: "ai_error",
          details: { error: message },
        });

        results.push({
          profileId,
          decision: "dudoso",
          confidence: 0,
          forgeryRisk: "medium",
          summary: message,
          error: message,
        });
      }
    }

    const summary = {
      processed: results.length,
      approved: results.filter((r) => r.decision === "approved").length,
      rejected: results.filter((r) => r.decision === "rejected").length,
      dudosos: results.filter((r) => r.decision === "dudoso").length,
      results,
    };

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
