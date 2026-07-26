import { CANCELLATION_FEE_REASON_LABELS } from "@/lib/payments/cancellationFee";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("preview_client_cancellation", {
      p_request_id: id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    const reason = (row?.reason as string | null) ?? null;
    return NextResponse.json({
      feeAmount: Number(row?.fee_amount ?? 0),
      feeApplies: Boolean(row?.fee_applies),
      reason,
      reasonLabel: reason
        ? (CANCELLATION_FEE_REASON_LABELS[reason] ?? reason)
        : "Sin cargo",
      hasHeldPayment: Boolean(row?.has_held_payment),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { acceptFee?: boolean };
    if (!body.acceptFee) {
      return NextResponse.json(
        { error: "Debes aceptar las condiciones de cancelación." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("client_cancel_service_request", {
      p_request_id: id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      ok: true,
      requestId: row?.request_id,
      feeId: row?.fee_id,
      feeAmount: Number(row?.fee_amount ?? 0),
      feeStatus: row?.fee_status,
      feePublicId: row?.fee_public_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
