import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { filterContactLeaks } from "@/lib/messaging/contactFilter";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      requestId?: string;
      amount?: number;
      description?: string;
    };

    const filtered = filterContactLeaks(body.description?.trim() ?? "");
    if (filtered.sanitized.length < 8) {
      return NextResponse.json(
        { error: "Describe el trabajo adicional sin datos de contacto." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("client_create_additional_payment", {
      p_request_id: body.requestId,
      p_amount: Number(body.amount),
      p_description: filtered.sanitized,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      ok: true,
      workOrderId: row?.work_order_id,
      paymentId: row?.payment_id,
      paymentPublicId: row?.payment_public_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
