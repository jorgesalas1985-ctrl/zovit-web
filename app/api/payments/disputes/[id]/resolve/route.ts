import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { executePaymentRefund } from "@/lib/payments/refundPayment";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: disputeId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      resolution?: "reembolso" | "liberacion";
      note?: string;
    };

    if (body.resolution !== "reembolso" && body.resolution !== "liberacion") {
      return NextResponse.json({ error: "Resolución inválida." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: dispute, error } = await admin
      .from("payment_disputes")
      .select("id,payment_id,status")
      .eq("id", disputeId)
      .maybeSingle();

    if (error || !dispute) {
      return NextResponse.json({ error: "Disputa no encontrada." }, { status: 404 });
    }

    if (!["abierta", "en_revision"].includes(dispute.status)) {
      return NextResponse.json({ error: "La disputa ya está resuelta." }, { status: 400 });
    }

    if (body.resolution === "reembolso") {
      await executePaymentRefund({
        paymentId: dispute.payment_id,
        actorId: auth.manager.userId,
        note: body.note ?? "Disputa resuelta con reembolso al cliente",
      });
      return NextResponse.json({ ok: true, resolution: "reembolso" });
    }

    const supabase = await createClient();
    const { error: releaseError } = await supabase.rpc("resolve_dispute_release", {
      p_dispute_id: disputeId,
      p_note: body.note ?? null,
    });

    if (releaseError) {
      return NextResponse.json({ error: releaseError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, resolution: "liberacion" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
