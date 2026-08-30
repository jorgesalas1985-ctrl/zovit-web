import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processIdentityAiReview, processPendingIdentityAiReviews } from "@/lib/verification/processIdentityAiReview";

async function authorize() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: profile } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
  return profile?.intranet_role === "hr_admin" || profile?.intranet_role === "super_admin";
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
  const supabase = await createClient();
  const [{ count: pending }, { count: dudosos }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_status", "pending").or("identity_ai_status.is.null,identity_ai_status.eq.pending,identity_ai_status.eq.processing"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_status", "pending").eq("identity_ai_status", "dudoso"),
  ]);
  return NextResponse.json({ pending: pending ?? 0, dudosos: dudosos ?? 0, openaiConfigured: true });
}

export async function POST(request: Request) {
  try {
    if (!(await authorize())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const body = await request.json() as { profileId?: string; limit?: number; includeDudosos?: boolean };
    if (body.profileId) {
      const result = await processIdentityAiReview(body.profileId);
      return NextResponse.json({ processed: 1, ...result });
    }
    const limit = Math.max(1, Math.min(15, Number(body.limit) || 8));
    return NextResponse.json(await processPendingIdentityAiReviews(limit, { includeDudosos: Boolean(body.includeDudosos) }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar la cola OCR." }, { status: 500 });
  }
}
