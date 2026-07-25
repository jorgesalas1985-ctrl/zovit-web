import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/providers";
import type { PaymentProviderName } from "@/lib/payments/types";

export async function executePaymentRefund(input: {
  paymentId: string;
  actorId: string;
  note?: string | null;
}): Promise<{ ok: true; providerRefunded: boolean }> {
  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("id,status,provider,provider_reference,public_id,amount_gross")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (error || !payment) {
    throw new Error(error?.message ?? "Pago no encontrado.");
  }

  if (
    !["pago_retenido", "trabajo_en_ejecucion", "esperando_aprobacion_cliente", "en_disputa"].includes(
      payment.status,
    )
  ) {
    throw new Error(`No se puede reembolsar en estado ${payment.status}.`);
  }

  let providerRefunded = false;
  const providerName = payment.provider as PaymentProviderName;

  if (providerName === "mercadopago") {
    const mpPaymentId = await resolveMercadoPagoPaymentId(
      payment.provider_reference,
      payment.public_id,
    );
    const provider = getPaymentProvider("mercadopago");
    const result = await provider.refund(mpPaymentId);
    if (!result.success) {
      throw new Error("Mercado Pago no confirmó el reembolso.");
    }
    providerRefunded = true;
  } else if (providerName === "mock") {
    const provider = getPaymentProvider("mock");
    await provider.refund(payment.provider_reference ?? payment.public_id);
    providerRefunded = true;
  } else {
    throw new Error(`Reembolso no soportado para proveedor ${providerName}.`);
  }

  const { error: rpcError } = await admin.rpc("refund_held_payment", {
    p_payment_id: payment.id,
    p_actor_id: input.actorId,
    p_note: input.note ?? null,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  return { ok: true, providerRefunded };
}

async function resolveMercadoPagoPaymentId(
  providerReference: string | null,
  publicId: string,
): Promise<string> {
  if (providerReference && /^\d+$/.test(providerReference.trim())) {
    return providerReference.trim();
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN.");
  }

  const url = new URL("https://api.mercadopago.com/v1/payments/search");
  url.searchParams.set("external_reference", publicId);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = (await response.json()) as {
    results?: Array<{ id?: number; status?: string }>;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo buscar el pago en Mercado Pago.");
  }

  const approved = (payload.results ?? []).find((row) => row.status === "approved" && row.id);
  if (!approved?.id) {
    throw new Error("No hay un pago aprobado de Mercado Pago para reembolsar.");
  }

  return String(approved.id);
}
