import { confirmPaymentReceived, PaymentConfirmationError } from "@/lib/payments/confirmPayment";
import { createAdminClient } from "@/lib/payments/server";
import { getPaymentProvider } from "@/lib/payments/providers";
import { MercadoPagoWebhookSignatureError } from "@/lib/payments/providers/mercadopago";
import type { PaymentProviderName } from "@/lib/payments/types";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ provider: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { provider: providerSlug } = await params;
    const providerName = providerSlug as PaymentProviderName;
    const provider = getPaymentProvider(providerName);
    const payload = await request.json();
    const url = new URL(request.url);

    const result = await provider.parseWebhook(payload, request.headers, url);

    if (result.status === "paid" && result.externalReference) {
      const admin = createAdminClient();
      const { data: paymentRow } = await admin
        .from("payments")
        .select("id,status,public_id,amount_gross,currency")
        .eq("public_id", result.externalReference)
        .maybeSingle();

      if (paymentRow && (paymentRow.status === "esperando_pago" || paymentRow.status === "pendiente")) {
        await confirmPaymentReceived({
          paymentId: paymentRow.id,
          provider: providerName,
          providerReference: result.reference,
          providerSessionId: result.reference,
          paymentMethod: result.paymentMethod ?? providerName,
          externalReference: result.externalReference,
          amountGross: Number(paymentRow.amount_gross),
          currency: paymentRow.currency,
          mercadoPagoPayment:
            providerName === "mercadopago" ? result.mercadoPagoPayment : undefined,
        });
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
