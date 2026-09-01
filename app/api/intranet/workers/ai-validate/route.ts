import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntranetReviewer } from "@/lib/intranet/apiAuth";
import { processPendingWorkerAiReviews } from "@/lib/worker/processWorkerAiBatch";

export async function GET() {
  try {
    if (!(await getIntranetReviewer())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const supabase = await createClient();
    const [{ count: pending }, { count: dudosos }] = await Promise.all([
      supabase.from("worker_registrations").select("profile_id", { count: "exact", head: true }).eq("status", "submitted").or("ai_review_status.is.null,ai_review_status.eq.pending,ai_review_status.eq.processing"),
      supabase.from("worker_registrations").select("profile_id", { count: "exact", head: true }).eq("status", "submitted").eq("ai_review_status", "dudoso"),
    ]);
    return NextResponse.json({ pending: pending ?? 0, dudosos: dudosos ?? 0, openaiConfigured: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la cola." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getIntranetReviewer())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const body = await request.json() as { limit?: number; includeDudosos?: boolean };
    const limit = Math.max(1, Math.min(15, Number(body.limit) || 8));
    return NextResponse.json(await processPendingWorkerAiReviews(limit, { includeDudosos: Boolean(body.includeDudosos) }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar la cola." }, { status: 500 });
  }
}
