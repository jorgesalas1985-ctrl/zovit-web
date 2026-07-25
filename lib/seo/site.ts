const DEFAULT_SITE_URL = "https://zovit.cl";

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  return DEFAULT_SITE_URL;
}

export const SITE_NAME = "ZOVIT";

export const SITE_TAGLINE = "Solicita un servicio. Paga al aprobar.";

export const SITE_DESCRIPTION =
  "Conectamos a quien necesita un servicio con profesionales verificados en Chile. El pago se libera solo cuando tú apruebas el trabajo.";

export const SITE_KEYWORDS = [
  "servicios a domicilio",
  "profesionales verificados",
  "pintor",
  "gasfiter",
  "electricista",
  "Zovit",
  "Chile",
  "pago protegido",
  "contratar servicio",
] as const;
