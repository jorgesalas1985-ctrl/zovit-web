/**
 * Tarifas referenciales Mercado Pago Chile (publicadas en mercadopago.cl).
 * Fuente principal: Point Smart / costos de cobro con tarjeta.
 * Checkout online suele usar ~2,89%–3,19% + IVA según plazo de liberación.
 * Verificar siempre en la cuenta MP / ayuda oficial: pueden cambiar.
 */

export const MP_FEE_SOURCE_URL =
  "https://www.mercadopago.cl/herramientas-para-vender/lectores-point";

export const MP_CHECKOUT_HELP_URL = "https://www.mercadopago.cl/ayuda/33399";

/** Procesamiento base referencial Checkout / link (vendedor), + IVA. */
export const MP_CHECKOUT_PROCESSING = {
  immediateReleasePct: 3.19,
  release10DaysPct: 2.89,
  ivaPct: 19,
} as const;

/**
 * Point Smart 2 — tramo < $2M/mes (al instante).
 * Débito no lleva financiamiento; crédito sí puede sumar cuotas.
 */
export const MP_POINT_SMART_BASE = {
  debitImmediatePct: 2.19,
  creditImmediatePct: 2.69,
  debit10DaysPct: 2.05,
  credit10DaysPct: 2.55,
} as const;

/**
 * Financiamiento por cuotas sin interés (crédito).
 * Se SUMA a la comisión de crédito. Publicado en página Point / ML.
 */
export const MP_CREDIT_INSTALLMENT_SURCHARGE = [
  { installments: 3, extraPct: 1.99 },
  { installments: 6, extraPct: 3.49 },
  { installments: 9, extraPct: 4.99 },
  { installments: 12, extraPct: 6.99 },
] as const;

export function formatPct(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

export function estimateMpProcessingWithIva(amount: number, ratePct: number): number {
  const fee = Math.round(amount * (ratePct / 100));
  const iva = Math.round(fee * (MP_CHECKOUT_PROCESSING.ivaPct / 100));
  return fee + iva;
}

/** Estimación conservadora Checkout Pro (liberación inmediata) + IVA. */
export function estimateCheckoutProcessingFee(amount: number): number {
  return estimateMpProcessingWithIva(amount, MP_CHECKOUT_PROCESSING.immediateReleasePct);
}

/** Extrae comisión MP (+IVA) desde la respuesta de un pago aprobado. */
export function extractMpProcessingFee(payment: {
  fee_details?: Array<{ type?: string; amount?: number }>;
  transaction_details?: { net_received_amount?: number; total_paid_amount?: number };
  transaction_amount?: number;
}): number {
  const details = payment.fee_details ?? [];
  const fromDetails = details.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  if (fromDetails > 0) return Math.round(fromDetails);

  const gross = Number(
    payment.transaction_details?.total_paid_amount ?? payment.transaction_amount ?? 0,
  );
  const net = Number(payment.transaction_details?.net_received_amount ?? 0);
  if (gross > 0 && net > 0 && gross >= net) return Math.round(gross - net);
  return 0;
}

export function creditInstallmentTotalPct(installments: number): number | null {
  const row = MP_CREDIT_INSTALLMENT_SURCHARGE.find((r) => r.installments === installments);
  if (!row) return null;
  return MP_POINT_SMART_BASE.creditImmediatePct + row.extraPct;
}

export const MP_FEES_BUYER_NOTICE =
  "ZOVIT acepta pagos electrónicos mediante Mercado Pago. El cliente asume el costo real de procesamiento del medio de pago; este cargo no corresponde a la comisión ZOVIT. Las cuotas e intereses bancarios son gestionados por Mercado Pago y la entidad emisora.";

export type InstallmentOption = 1 | 3 | 6 | 9 | 12;

export type ClientChargeBreakdown = {
  serviceAmount: number;
  installments: InstallmentOption;
  financingFee: number;
  financingIva: number;
  providerFinancingFee: number;
  processingFee: number;
  clientChargedAmount: number;
  ratePct: number;
  label: string;
};

/** Gross-up: el cliente cubre el procesamiento y ZOVIT conserva íntegro el subtotal. */
export function grossUpCheckoutProcessing(serviceAmount: number, installmentExtraPct = 0): {
  processingFee: number;
  clientChargedAmount: number;
} {
  const amount = Math.max(0, Math.round(serviceAmount));
  const totalRatePct = MP_CHECKOUT_PROCESSING.immediateReleasePct + installmentExtraPct;
  const effectiveRate = (totalRatePct / 100) *
    (1 + MP_CHECKOUT_PROCESSING.ivaPct / 100);
  let charged = Math.ceil(amount / (1 - effectiveRate));
  while (charged - estimateMpProcessingWithIva(charged, totalRatePct) < amount) charged += 1;
  return { processingFee: charged - amount, clientChargedAmount: charged };
}

export function parseInstallmentOption(value: unknown): InstallmentOption {
  const n = Number(value);
  if (n === 3 || n === 6 || n === 9 || n === 12) return n;
  return 1;
}

/** Calcula subtotal + procesamiento MP. Cuotas/intereses los gestiona Mercado Pago. */
export function calculateClientCharge(
  serviceAmount: number,
  installments: InstallmentOption,
): ClientChargeBreakdown {
  const amount = Math.max(0, Math.round(serviceAmount));
  const installmentRow = MP_CREDIT_INSTALLMENT_SURCHARGE.find((row) => row.installments === installments);
  const installmentExtraPct = installmentRow?.extraPct ?? 0;
  const grossedUp = grossUpCheckoutProcessing(amount, installmentExtraPct);

  return {
    serviceAmount: amount,
    installments,
    financingFee: 0,
    financingIva: 0,
    providerFinancingFee: 0,
    processingFee: grossedUp.processingFee,
    clientChargedAmount: grossedUp.clientChargedAmount,
    ratePct: MP_CHECKOUT_PROCESSING.immediateReleasePct + installmentExtraPct,
    label: installments <= 1 ? "Débito / crédito" : `Crédito ${installments}×`,
  };
}
