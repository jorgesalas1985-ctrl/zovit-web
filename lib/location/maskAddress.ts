/**
 * Enmascara la dirección exacta hasta que exista pago protegido.
 * Conserva una zona aproximada (comuna / último segmento) para cotizar.
 */
export function maskServiceAddress(fullAddress: string | null | undefined): string {
  const raw = String(fullAddress ?? "").trim();
  if (!raw) return "Zona por confirmar";

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `Zona: ${parts[parts.length - 1]}`;
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return `Zona: ${tokens.slice(-2).join(" ")}`;
  }

  return "Zona aproximada (dirección exacta tras el pago)";
}
