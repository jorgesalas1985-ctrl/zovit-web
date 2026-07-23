import type { PaymentRecord, PaymentStatus } from "@/lib/payments/types";

type PaymentRow = {
  id: string;
  public_id: string;
  work_order_id: string;
  request_id: string;
  client_id: string;
  professional_id: string;
  amount_gross: number;
  platform_fee: number;
  tax_amount: number;
  amount_net: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentRecord["provider"];
  provider_reference: string | null;
  payment_method: string | null;
  paid_at: string | null;
  released_at: string | null;
  created_at: string;
};

export function mapPaymentRow(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    publicId: row.public_id,
    workOrderId: row.work_order_id,
    requestId: row.request_id,
    clientId: row.client_id,
    professionalId: row.professional_id,
    amountGross: Number(row.amount_gross),
    platformFee: Number(row.platform_fee),
    taxAmount: Number(row.tax_amount),
    amountNet: Number(row.amount_net),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
    releasedAt: row.released_at,
    createdAt: row.created_at,
  };
}

export function isPendingPayment(status: PaymentStatus): boolean {
  return status === "pendiente" || status === "esperando_pago";
}

export function isHeldPayment(status: PaymentStatus): boolean {
  return ["pago_recibido", "pago_retenido", "trabajo_en_ejecucion", "trabajo_finalizado", "esperando_aprobacion_cliente"].includes(status);
}

export function isCompletedPayment(status: PaymentStatus): boolean {
  return status === "pago_liberado";
}
