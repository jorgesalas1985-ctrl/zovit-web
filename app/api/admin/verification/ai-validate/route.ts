import { isAiConfigured } from "@/lib/ai/provider";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  processIdentityAiReview,
  processPendingIdentityAiReviews,
} from "@/lib/verification/processIdentityAiReview";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("error" in auth) return auth.error;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id,identity_ai_status,identity_status,identity_submitted_at")
      .eq("identity_status", "pending")
      .order("identity_submitted_at", { ascending: true })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    return NextResponse.json({
      openaiConfigured: isAiConfigured(),
      pending: rows.filter((r) => !r.identity_ai_status || r.identity_ai_status === "pending").length,
      processing: rows.filter((r) => r.identity_ai_status === "processing").length,
      dudosos: rows.filter((r) => r.identity_ai_status === "dudoso").length,
      totalPendingIdentity: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as {
      profileId?: string;
      limit?: number;
      includeDudosos?: boolean;
    };

    if (body.profileId) {
      const result = await processIdentityAiReview(body.profileId);
      return NextResponse.json({ ok: true, ...result });
    }

    const stats = await processPendingIdentityAiReviews(
      Math.min(Math.max(Number(body.limit) || 10, 1), 25),
      { includeDudosos: body.includeDudosos === true },
    );
    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
