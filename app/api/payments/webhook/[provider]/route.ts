import { confirmPaymentReceived, PaymentConfirmationError } from "@/lib/payments/confirmPayment";
import { createAdminClient } from "@/lib/payments/server";
import { getPaymentProvider, isMockPaymentsAllowed } from "@/lib/payments/providers";
import { MercadoPagoWebhookSignatureError } from "@/lib/payments/providers/mercadopago";
import type { PaymentProviderName } from "@/lib/payments/types";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ provider: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`webhook:${ip}`, { limit: 120, windowMs: 60_000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const { provider: providerSlug } = await params;
    const providerName = providerSlug as PaymentProviderName;

    if (providerName === "mock" && !isMockPaymentsAllowed()) {
      return NextResponse.json({ error: "Webhook mock deshabilitado." }, { status: 404 });
    }

    const provider = getPaymentProvider(providerName);
    const payload = await request.json();
    const url = new URL(request.url);

    const result = await provider.parseWebhook(payload, request.headers, url);

    if (result.status === "paid" && result.externalReference) {
      const admin = createAdminClient();
      const { data: paymentRow } = await admin
        .from("payments")
        .select("id,status,public_id,amount_gross,currency,client_charged_amount")
        .eq("public_id", result.externalReference)
        .maybeSingle();

      if (
        paymentRow &&
        (paymentRow.status === "esperando_pago" ||
          paymentRow.status === "pendiente" ||
          paymentRow.status === "cancelado")
      ) {
        const charged =
          paymentRow.client_charged_amount != null
            ? Number(paymentRow.client_charged_amount)
            : Number(paymentRow.amount_gross);
        await confirmPaymentReceived({
          paymentId: paymentRow.id,
          provider: providerName,
          providerReference: result.reference,
          providerSessionId: result.reference,
          paymentMethod: result.paymentMethod ?? providerName,
          externalReference: result.externalReference,
          amountGross: charged,
          currency: paymentRow.currency,
          mercadoPagoPayment:
            providerName === "mercadopago" ? result.mercadoPagoPayment : undefined,
        });
      } else if (String(result.externalReference).startsWith("ZVT-CFEE-")) {
        const { data: feeRow } = await admin
          .from("cancellation_fees")
          .select("id,status,amount,public_id")
          .eq("public_id", result.externalReference)
          .maybeSingle();

        if (feeRow && feeRow.status === "pendiente") {
          const mpAmount = result.mercadoPagoPayment?.transaction_amount;
          if (
            providerName === "mercadopago" &&
            mpAmount !== undefined &&
            Number(mpAmount) !== Number(feeRow.amount)
          ) {
            return NextResponse.json({ error: "Monto de cargo no coincide." }, { status: 400 });
          }
          await admin.rpc("mark_cancellation_fee_paid", {
            p_fee_id: feeRow.id,
            p_provider: providerName,
            p_provider_reference: result.reference,
            p_provider_session_id: result.reference,
          });
        }
      }
    }

    return NextResponse.json({ received: true, status: result.status, reference: result.reference });
  } catch (error) {
    if (error instanceof MercadoPagoWebhookSignatureError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PaymentConfirmationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Webhook inválido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
