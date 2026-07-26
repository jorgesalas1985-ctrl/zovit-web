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

export function creditInstallmentTotalPct(installments: number): number | null {
  const row = MP_CREDIT_INSTALLMENT_SURCHARGE.find((r) => r.installments === installments);
  if (!row) return null;
  return MP_POINT_SMART_BASE.creditImmediatePct + row.extraPct;
}

export const MP_FEES_BUYER_NOTICE =
  "En Mercado Pago, el pago con débito no agrega financiamiento. Con tarjeta de crédito, si eliges cuotas, Mercado Pago puede aplicar las comisiones/financiamiento vigentes (las publicadas en su sitio, p. ej. 3× 1,99%, 6× 3,49%, 9× 4,99%, 12× 6,99% adicionales sobre la comisión de crédito).";
