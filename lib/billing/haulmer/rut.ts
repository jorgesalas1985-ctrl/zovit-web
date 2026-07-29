/**
 * Helpers RUT Chile para DTE Haulmer/OpenFactura.
 */

export function stripRut(value: string): string {
  return value.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
}

/** Formato SII/Haulmer: 12345678-9 (sin puntos). */
export function formatRutForHaulmer(value: string): string {
  const clean = stripRut(value);
  if (!clean.includes("-") && clean.length >= 2) {
    return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
  }
  return clean;
}

export function isValidChileanRut(value: string): boolean {
  const formatted = formatRutForHaulmer(value);
  const match = /^(\d{1,8})-([\dK])$/.exec(formatted);
  if (!match) return false;
  const body = match[1];
  const dv = match[2];
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 11 ? "0" : expected === 10 ? "K" : String(expected);
  return expectedDv === dv;
}

/** Receptor genérico de boleta cuando el cliente no informó RUT. */
export const BOLETA_GENERIC_RECEPTOR_RUT = "66666666-6";
