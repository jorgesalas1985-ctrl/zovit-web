import { confirmPaymentReceived, PaymentConfirmationError } from "@/lib/payments/confirmPayment";
import { syncMercadoPagoReturn } from "@/lib/payments/providers/mercadopago";
import { createClient } from "@/lib/supabase/server";
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
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { data: paymentRow } = await supabase
      .from("payments")
      .select("id,status,public_id,amount_gross,currency,client_id")
      .eq("public_id", externalReference)
      .maybeSingle();

    if (!paymentRow) {
      return NextResponse.json({ error: "Pago ZOVIT no encontrado." }, { status: 404 });
    }

    if (paymentRow.client_id !== authData.user.id) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    if (paymentRow.status !== "esperando_pago" && paymentRow.status !== "pendiente") {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        status: paymentRow.status,
      });
    }

    if (!body.paymentId?.trim()) {
      return NextResponse.json({ error: "Falta paymentId de Mercado Pago." }, { status: 400 });
    }

    const sync = await syncMercadoPagoReturn({
      externalReference,
      mercadoPagoPaymentId: body.paymentId,
      collectionStatus: body.collectionStatus ?? body.status,
    });

    if (!sync.shouldRegister || !sync.mercadoPagoPayment) {
      return NextResponse.json({
        ok: true,
        registered: false,
        status: body.collectionStatus ?? body.status ?? "unknown",
      });
    }

    const result = await confirmPaymentReceived({
      paymentId: paymentRow.id,
      provider: "mercadopago",
      providerReference: sync.reference,
      providerSessionId: body.paymentId,
      paymentMethod: sync.paymentMethod,
      externalReference: paymentRow.public_id,
      amountGross: Number(paymentRow.amount_gross),
      currency: paymentRow.currency,
      mercadoPagoPayment: sync.mercadoPagoPayment,
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        status: result.status,
      });
    }

    return NextResponse.json({ ok: true, registered: true, status: "pago_retenido" });
  } catch (error) {
    if (error instanceof PaymentConfirmationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
