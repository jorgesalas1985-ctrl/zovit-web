import { ZOVIT_ISSUER } from "@/lib/billing/company";
import type { HaulmerEnvironment } from "@/lib/billing/haulmer/types";
import { formatRutForHaulmer } from "@/lib/billing/haulmer/rut";

const DEV_BASE = "https://dev-api.haulmer.com";
const PROD_BASE = "https://api.haulmer.com";

/** API key pública de OpenFactura (solo si HAULMER_USE_PUBLIC_SANDBOX=true). */
export const HAULMER_PUBLIC_DEV_API_KEY = "928e15a2d14d4a6292345f04960f4bd3";

export type HaulmerConfig = {
  enabled: boolean;
  environment: HaulmerEnvironment;
  apiKey: string | null;
  baseUrl: string;
  autoEmit: boolean;
  usesPublicSandbox: boolean;
  giroEmisor: string;
  acteco: number | null;
  cdgSiiSucur: string | null;
  emitterRut: string;
  emitterLegalName: string;
  emitterAddress: string;
  emitterCommune: string;
};

function isTruthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

export function getHaulmerEnvironment(): HaulmerEnvironment {
  const raw = (process.env.HAULMER_ENV ?? process.env.HAULMER_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();

  if (raw === "production" || raw === "prod") return "production";
  if (raw === "development" || raw === "dev" || raw === "sandbox") return "development";

  // Sin HAULMER_ENV explícito: producción falla cerrado a API real.
  return isProductionRuntime() ? "production" : "development";
}

export function getHaulmerConfig(): HaulmerConfig {
  const environment = getHaulmerEnvironment();
  const explicitKey = process.env.HAULMER_API_KEY?.trim() || null;
  const allowPublicSandbox =
    environment === "development" && isTruthy(process.env.HAULMER_USE_PUBLIC_SANDBOX);

  // Nunca usar la key pública en producción ni por omisión silenciosa.
  const apiKey =
    explicitKey || (allowPublicSandbox ? HAULMER_PUBLIC_DEV_API_KEY : null);

  const actecoRaw = process.env.HAULMER_ACTECO?.trim();
  const acteco = actecoRaw && /^\d+$/.test(actecoRaw) ? Number(actecoRaw) : null;

  return {
    enabled: isTruthy(process.env.HAULMER_DTE_ENABLED),
    environment,
    apiKey,
    baseUrl: environment === "production" ? PROD_BASE : DEV_BASE,
    autoEmit: isTruthy(process.env.HAULMER_AUTO_EMIT),
    usesPublicSandbox: Boolean(allowPublicSandbox && !explicitKey),
    giroEmisor:
      process.env.HAULMER_GIRO_EMISOR?.trim() ||
      "SERVICIOS DE IMPRESION Y PLATAFORMA DIGITAL DE INTERMEDIACION",
    acteco,
    cdgSiiSucur: process.env.HAULMER_CDG_SII_SUCUR?.trim() || null,
    emitterRut: formatRutForHaulmer(ZOVIT_ISSUER.rut),
    emitterLegalName: ZOVIT_ISSUER.legalName,
    emitterAddress: ZOVIT_ISSUER.address,
    emitterCommune: ZOVIT_ISSUER.commune,
  };
}

export function haulmerIsConfigured(): boolean {
  const config = getHaulmerConfig();
  if (!config.enabled) return false;
  if (!config.apiKey) return false;
  // Producción exige API key propia (nunca sandbox público).
  if (config.environment === "production" && config.usesPublicSandbox) return false;
  return true;
}
