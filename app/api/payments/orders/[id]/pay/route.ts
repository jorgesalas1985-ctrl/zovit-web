import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments/providers";
import { validateMercadoPagoPublicUrl } from "@/lib/payments/providers/mercadopago";
import { mapPaymentRow } from "@/lib/payments/mappers";
import type { PaymentProviderName } from "@/lib/payments/types";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { provider?: PaymentProviderName };
    const providerName = body.provider ?? "mock";

    if (providerName === "mercadopago") {
      const publicUrlError = validateMercadoPagoPublicUrl();
      if (publicUrlError) {
        return NextResponse.json({ error: publicUrlError }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const { data: paymentRow, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (paymentError || !paymentRow) {
      return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 });
    }

    const payment = mapPaymentRow(paymentRow as never);
    if (payment.clientId !== authData.user?.id) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    if (payment.status !== "esperando_pago") {
      return NextResponse.json({ error: "El pago no está pendiente." }, { status: 400 });
    }

    const provider = getPaymentProvider(providerName);
    const session = await provider.createSession({
      paymentId: payment.id,
      publicId: payment.publicId,
      amount: payment.amountGross,
      currency: payment.currency,
      clientEmail: authData.user?.email ?? undefined,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pagos?payment=${payment.publicId}`,
      metadata: { requestId: payment.requestId },
    });

    await supabase
      .from("payments")
      .update({
        provider: providerName,
        provider_session_id: session.sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (providerName === "mock") {
      const { error: registerError } = await supabase.rpc("register_payment_received", {
        p_payment_id: payment.id,
        p_provider: providerName,
        p_provider_reference: session.reference,
        p_provider_session_id: session.sessionId,
        p_payment_method: providerName,
      });

      if (registerError) {
        return NextResponse.json({ error: registerError.message }, { status: 400 });
      }

      return NextResponse.json({
        session,
        paymentPublicId: payment.publicId,
        status: "pago_retenido",
      });
    }

    return NextResponse.json({
      session,
      paymentPublicId: payment.publicId,
      status: "esperando_pago",
      message: "Redirigiendo a Mercado Pago…",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
