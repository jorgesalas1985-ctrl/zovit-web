import { createAdminClient } from "@/lib/payments/server";
import type { PaymentProviderName } from "@/lib/payments/types";

export type MercadoPagoPaymentDetails = {
  status: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
};

export type ConfirmPaymentInput = {
  paymentId: string;
  provider: PaymentProviderName;
  providerReference: string;
  providerSessionId?: string | null;
  paymentMethod?: string | null;
  externalReference: string;
  amountGross: number;
  currency: string;
  mercadoPagoPayment?: MercadoPagoPaymentDetails;
};

export class PaymentConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfirmationError";
  }
}

export function validateMercadoPagoPayment(
  payment: { publicId: string; amountGross: number; currency: string },
  mpPayment: MercadoPagoPaymentDetails
): void {
  if (mpPayment.status !== "approved") {
    throw new PaymentConfirmationError("Pago Mercado Pago no aprobado.");
  }

  if (mpPayment.external_reference !== payment.publicId) {
    throw new PaymentConfirmationError("external_reference no coincide con el pago ZOVIT.");
  }

  const mpAmount = mpPayment.transaction_amount;
  if (mpAmount === undefined || Number(payment.amountGross) !== Number(mpAmount)) {
    throw new PaymentConfirmationError("El monto del pago no coincide con amount_gross.");
  }

  const mpCurrency = mpPayment.currency_id ?? payment.currency;
  if (mpCurrency !== "CLP" || payment.currency !== "CLP") {
    throw new PaymentConfirmationError("La moneda del pago debe ser CLP.");
  }
}

export async function confirmPaymentReceived(
  input: ConfirmPaymentInput
): Promise<{ alreadyProcessed: boolean; status: string }> {
  const admin = createAdminClient();

  const { data: paymentRow, error: fetchError } = await admin
    .from("payments")
    .select("id,status,public_id,amount_gross,currency,client_id")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (fetchError || !paymentRow) {
    throw new PaymentConfirmationError("Pago ZOVIT no encontrado.");
  }

  if (input.externalReference !== paymentRow.public_id) {
    throw new PaymentConfirmationError("external_reference no coincide con el pago ZOVIT.");
  }

  if (Number(input.amountGross) !== Number(paymentRow.amount_gross)) {
    throw new PaymentConfirmationError("El monto indicado no coincide con amount_gross.");
  }

  if (input.currency !== paymentRow.currency) {
    throw new PaymentConfirmationError("La moneda indicada no coincide con el pago ZOVIT.");
  }

  if (paymentRow.status !== "esperando_pago" && paymentRow.status !== "pendiente") {
    return { alreadyProcessed: true, status: paymentRow.status };
  }

  if (input.mercadoPagoPayment) {
    validateMercadoPagoPayment(
      {
        publicId: paymentRow.public_id,
        amountGross: Number(paymentRow.amount_gross),
        currency: paymentRow.currency,
      },
      input.mercadoPagoPayment
    );
  }

  const { error } = await admin.rpc("register_payment_received", {
    p_payment_id: paymentRow.id,
    p_provider: input.provider,
    p_provider_reference: input.providerReference,
    p_provider_session_id: input.providerSessionId ?? null,
    p_payment_method: input.paymentMethod ?? input.provider,
    p_external_reference: input.externalReference,
    p_amount_gross: Number(paymentRow.amount_gross),
  });

  if (error) {
    throw new PaymentConfirmationError(error.message);
  }

  return { alreadyProcessed: false, status: "pago_retenido" };
}
