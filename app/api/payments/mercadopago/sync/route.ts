import { createClient } from "@/lib/supabase/server";
import { syncMercadoPagoReturn } from "@/lib/payments/providers/mercadopago";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      externalReference?: string;
      paymentId?: string;
      collectionStatus?: string;
      status?: string;
    };

    const externalReference = body.externalReference?.trim();
    if (!externalReference) {
      return NextResponse.json({ error: "Falta external_reference." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: paymentRow } = await supabase
      .from("payments")
      .select("id,status,public_id")
      .eq("public_id", externalReference)
      .maybeSingle();

    if (!paymentRow) {
      return NextResponse.json({ error: "Pago ZOVIT no encontrado." }, { status: 404 });
    }

    if (paymentRow.status !== "esperando_pago") {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        status: paymentRow.status,
      });
    }

    const sync = await syncMercadoPagoReturn({
      externalReference,
      mercadoPagoPaymentId: body.paymentId,
      collectionStatus: body.collectionStatus ?? body.status,
    });

    if (!sync.shouldRegister) {
      return NextResponse.json({
        ok: true,
        registered: false,
        status: body.collectionStatus ?? body.status ?? "unknown",
      });
    }

    const { error } = await supabase.rpc("register_payment_received", {
      p_payment_id: paymentRow.id,
      p_provider: "mercadopago",
      p_provider_reference: sync.reference,
      p_provider_session_id: body.paymentId ?? null,
      p_payment_method: sync.paymentMethod,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, registered: true, status: "pago_retenido" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
