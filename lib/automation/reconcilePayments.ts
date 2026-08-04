import { confirmPaymentReceived } from "@/lib/payments/confirmPayment";
import { extractMpProcessingFee } from "@/lib/payments/mercadopagoFees";
import { createAdminClient } from "@/lib/supabase/admin";

type MpSearchPayment = {
  id: number;
  status: string;
  external_reference?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  currency_id?: string;
  fee_details?: Array<{ type?: string; amount?: number }>;
  transaction_details?: { net_received_amount?: number; total_paid_amount?: number };
};

/**
 * Recupera pagos atascados en esperando_pago buscando en Mercado Pago por external_reference.
 */
export async function reconcilePendingMercadoPagoPayments(limit = 10): Promise<{
  checked: number;
  confirmed: number;
}> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { checked: 0, confirmed: 0 };

  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("payments")
    .select("id,public_id,status,amount_gross,client_charged_amount,currency,provider_session_id")
    .in("status", ["esperando_pago", "pendiente"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) {
    return { checked: 0, confirmed: 0 };
  }

  let confirmed = 0;

  for (const payment of pending) {
    try {
      const url = new URL("https://api.mercadopago.com/v1/payments/search");
      url.searchParams.set("external_reference", payment.public_id);
      url.searchParams.set("sort", "date_created");
      url.searchParams.set("criteria", "desc");

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as { results?: MpSearchPayment[] };
      const approved = (payload.results ?? []).find((p) => p.status === "approved");
      if (!approved) continue;

      const charged =
        payment.client_charged_amount != null
          ? Number(payment.client_charged_amount)
          : Number(payment.amount_gross);
      const mpAmount = Number(approved.transaction_amount ?? charged);
      if (mpAmount !== charged) continue;

      await confirmPaymentReceived({
        paymentId: payment.id,
        provider: "mercadopago",
        providerReference: String(approved.id),
        providerSessionId: payment.provider_session_id ?? String(approved.id),
        paymentMethod: approved.payment_method_id ?? null,
        externalReference: payment.public_id,
        amountGross: charged,
        currency: payment.currency,
        mercadoPagoPayment: {
          status: approved.status,
          external_reference: approved.external_reference ?? payment.public_id,
          transaction_amount: mpAmount,
          currency_id: approved.currency_id ?? "CLP",
          provider_processing_fee: extractMpProcessingFee(approved),
        },
      });
      confirmed += 1;
    } catch {
      // sigue con el siguiente
    }
  }

  return { checked: pending.length, confirmed };
}
