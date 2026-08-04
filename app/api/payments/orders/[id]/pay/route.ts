import { confirmPaymentReceived } from "@/lib/payments/confirmPayment";
import {
  calculateClientCharge,
  estimateCheckoutProcessingFee,
  parseInstallmentOption,
} from "@/lib/payments/mercadopagoFees";
import { getPaymentProvider, isMockPaymentsAllowed } from "@/lib/payments/providers";
import {
  MercadoPagoProvider,
  validateMercadoPagoPublicUrl,
} from "@/lib/payments/providers/mercadopago";
import { mapPaymentRow } from "@/lib/payments/mappers";
import type { PaymentProviderName } from "@/lib/payments/types";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { isValidUuid } from "@/lib/security/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      provider?: PaymentProviderName;
      installments?: number;
    };
    const providerName: PaymentProviderName =
      body.provider === "mock" && isMockPaymentsAllowed() ? "mock" : "mercadopago";
    const installments = parseInstallmentOption(body.installments);

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

    const charge = calculateClientCharge(payment.amountGross, installments);
    const existingPreferenceId =
      (paymentRow as { provider_session_id?: string | null }).provider_session_id ?? null;
    const sameInstallments =
      payment.installmentCount == null || Number(payment.installmentCount) === charge.installments;
    const sameCharge =
      payment.clientChargedAmount == null ||
      Number(payment.clientChargedAmount) === charge.clientChargedAmount;

    // Idempotencia: reutilizar preferencia activa si el plan de cuotas no cambió.
    if (
      providerName === "mercadopago" &&
      existingPreferenceId &&
      sameInstallments &&
      sameCharge
    ) {
      const mp = new MercadoPagoProvider();
      const reused = await mp.getCheckoutPreference(existingPreferenceId);
      if (reused?.redirectUrl) {
        return NextResponse.json({
          session: reused,
          paymentPublicId: payment.publicId,
          status: "esperando_pago",
          charge,
          reused: true,
          message: "Reanudando checkout Mercado Pago…",
        });
      }
    }

    const processingFeeEstimated = estimateCheckoutProcessingFee(charge.clientChargedAmount);

    await admin
      .from("payments")
      .update({
        client_charged_amount: charge.clientChargedAmount,
        installment_count: charge.installments,
        provider_financing_fee: charge.providerFinancingFee,
        provider_processing_fee_estimated: processingFeeEstimated,
        checkout_preference_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "esperando_pago");

    const provider = getPaymentProvider(providerName);
    const session = await provider.createSession({
      paymentId: payment.id,
      publicId: payment.publicId,
      amount: charge.clientChargedAmount,
      currency: payment.currency,
      clientEmail: authData.user.email ?? undefined,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pagos?payment=${payment.publicId}`,
      installments: charge.installments,
      metadata: {
        requestId: payment.requestId,
        installments: String(charge.installments),
        financingFee: String(charge.providerFinancingFee),
      },
    });

    await admin
      .from("payments")
      .update({
        provider: providerName,
        provider_session_id: session.sessionId,
        checkout_preference_id: providerName === "mercadopago" ? session.sessionId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "esperando_pago");

    if (providerName === "mock") {
      await confirmPaymentReceived({
        paymentId: payment.id,
        provider: providerName,
        providerReference: session.reference,
        providerSessionId: session.sessionId,
        paymentMethod: providerName,
        externalReference: payment.publicId,
        amountGross: charge.clientChargedAmount,
        currency: payment.currency,
      });

      return NextResponse.json({
        session,
        paymentPublicId: payment.publicId,
        status: "pago_retenido",
        charge,
      });
    }

    return NextResponse.json({
      session,
      paymentPublicId: payment.publicId,
      status: "esperando_pago",
      charge,
      message: "Redirigiendo a Mercado Pago…",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
