import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments/providers";
import type { PaymentProviderName } from "@/lib/payments/types";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ provider: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { provider: providerSlug } = await params;
    const providerName = providerSlug as PaymentProviderName;
    const provider = getPaymentProvider(providerName);
    const payload = await request.json();

    const result = await provider.parseWebhook(payload, request.headers);
    const supabase = await createClient();

    if (result.status === "paid" && result.externalReference) {
      const { data: paymentRow } = await supabase
        .from("payments")
        .select("id,status")
        .eq("public_id", result.externalReference)
        .maybeSingle();

      if (paymentRow && paymentRow.status === "esperando_pago") {
        const { error } = await supabase.rpc("register_payment_received", {
          p_payment_id: paymentRow.id,
          p_provider: providerName,
          p_provider_reference: result.reference,
          p_provider_session_id: result.reference,
          p_payment_method: result.paymentMethod ?? providerName,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ received: true, status: result.status, reference: result.reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook inválido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
