/** Folio público tipo Duoc: ZV-######### */
export function generateCertificateFolio(now = new Date()): string {
  const year = now.getFullYear().toString().slice(-2);
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => (b % 10).toString()).join("");
  return `ZV-${year}${body}`;
}

export function normalizeCertificateFolio(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) return null;

  try {
    if (value.includes("/CERTIFICADOS/") || value.includes("HTTP")) {
      const url = value.startsWith("HTTP")
        ? new URL(value)
        : new URL(value, "https://zovit.cl");
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p.toLowerCase() === "certificados");
      if (idx >= 0 && parts[idx + 1] && parts[idx + 1].toLowerCase() !== "validar") {
        return normalizeCertificateFolio(parts[idx + 1]);
      }
    }
  } catch {
    // fall through
  }

  const compact = value.replace(/\s+/g, "");
  const match = compact.match(/^ZV-?(\d{8,12})$/i);
  if (match) return `ZV-${match[1]}`;

  if (/^\d{8,12}$/.test(compact)) return `ZV-${compact}`;

  return null;
}

export function maskChileanRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return null;
  return `******-${clean.slice(-1)}`;
}
