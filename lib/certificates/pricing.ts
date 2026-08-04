/**
 * Precio del certificado emitido.
 * Gratis mientras ZOVIT crece: deja ZOVIT_CERTIFICATE_PRICE_CLP sin definir o en 0.
 * Cuando quieras cobrar: define p.ej. ZOVIT_CERTIFICATE_PRICE_CLP=4990 y redeploy.
 */
export function getCertificatePriceClp(): number {
  const raw = process.env.ZOVIT_CERTIFICATE_PRICE_CLP;
  if (raw == null || raw.trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function isCertificateIssuanceFree(): boolean {
  return getCertificatePriceClp() <= 0;
}

export function certificateBillingForPrice(priceClp: number): "free" | "pending" {
  return priceClp <= 0 ? "free" : "pending";
}
