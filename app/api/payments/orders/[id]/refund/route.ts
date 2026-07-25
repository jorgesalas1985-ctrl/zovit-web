import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { executePaymentRefund } from "@/lib/payments/refundPayment";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Solo super admin: reembolso MP + unwind del escrow. */
export async function POST(request: Request, { params }: Params) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { note?: string };
    const result = await executePaymentRefund({
      paymentId: id,
      actorId: auth.manager.userId,
      note: body.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
