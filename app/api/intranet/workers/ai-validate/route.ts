import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { isValidUuid } from "@/lib/security/validation";
import {
  processPendingWorkerAiReviews,
  processWorkerAiReview,
} from "@/lib/worker/processWorkerAiBatch";

const BATCH_DEFAULT = 8;
const BATCH_MAX = 20;

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
      const missing = /ai_review_status|worker_registrations|schema cache|does not exist/i.test(
        error.message,
      );
      if (missing) {
        // Sin migración: cola vacía, sin error ruidoso en la UI.
        return NextResponse.json({
          pending: 0,
          dudosos: 0,
          queue: [],
          migrationRequired: true,
          openaiConfigured: (await import("@/lib/ai/provider")).isAiConfigured(),
        });
      }
      return NextResponse.json(
        { error: error.message, code: "QUERY_ERROR" },
        { status: 400 },
      );
    }

    const rows = data ?? [];
    return NextResponse.json({
      pending: rows.filter((r) => r.ai_review_status !== "dudoso").length,
      dudosos: rows.filter((r) => r.ai_review_status === "dudoso").length,
      queue: rows,
      migrationRequired: false,
      openaiConfigured: (await import("@/lib/ai/provider")).isAiConfigured(),
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

    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
      includeDudosos?: boolean;
      profileIds?: string[];
      profileId?: string;
    };

    if (body.profileId) {
      if (!isValidUuid(body.profileId)) {
        return NextResponse.json({ error: "profileId inválido." }, { status: 400 });
      }
      const one = await processWorkerAiReview(body.profileId);
      return NextResponse.json({
        processed: 1,
        approved: one.decision === "approved" ? 1 : 0,
        rejected: one.decision === "rejected" ? 1 : 0,
        dudosos: one.decision === "dudoso" ? 1 : 0,
        results: [{ profileId: body.profileId, ...one }],
      });
    }

    const limit = Math.min(BATCH_MAX, Math.max(1, Number(body.limit) || BATCH_DEFAULT));
    const summary = await processPendingWorkerAiReviews(limit, {
      includeDudosos: body.includeDudosos === true,
      profileIds: body.profileIds,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
