import { confirmPaymentReceived } from "@/lib/payments/confirmPayment";
import { getPaymentProvider, isMockPaymentsAllowed } from "@/lib/payments/providers";
import { validateMercadoPagoPublicUrl } from "@/lib/payments/providers/mercadopago";
import { mapPaymentRow } from "@/lib/payments/mappers";
import type { PaymentProviderName } from "@/lib/payments/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { provider?: PaymentProviderName };
    const providerName: PaymentProviderName =
      body.provider === "mock" && isMockPaymentsAllowed() ? "mock" : "mercadopago";

    if (providerName === "mock" && !isMockPaymentsAllowed()) {
      return NextResponse.json(
        { error: "En producción solo se acepta Mercado Pago con cobro real." },
        { status: 400 },
      );
    }

    if (providerName === "mercadopago") {
      const publicUrlError = validateMercadoPagoPublicUrl();
      if (publicUrlError) {
        return NextResponse.json({ error: publicUrlError }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: paymentRow, error: paymentError } = await admin
      .from("payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (paymentError || !paymentRow) {
      return NextResponse.json(
        { error: paymentError?.message ?? "Pago no encontrado." },
        { status: paymentError ? 400 : 404 },
      );
    }

    const payment = mapPaymentRow(paymentRow as never);
    if (payment.clientId !== authData.user.id) {
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
      clientEmail: authData.user.email ?? undefined,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pagos?payment=${payment.publicId}`,
      metadata: { requestId: payment.requestId },
    });

    await admin
      .from("payments")
      .update({
        provider: providerName,
        provider_session_id: session.sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (providerName === "mock") {
      // Solo desarrollo: confirma vía service_role (nunca authenticated).
      await confirmPaymentReceived({
        paymentId: payment.id,
        provider: providerName,
        providerReference: session.reference,
        providerSessionId: session.sessionId,
        paymentMethod: providerName,
        externalReference: payment.publicId,
        amountGross: payment.amountGross,
        currency: payment.currency,
      });

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
