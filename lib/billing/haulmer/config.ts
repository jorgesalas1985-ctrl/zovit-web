import { ZOVIT_ISSUER } from "@/lib/billing/company";
import type { HaulmerEnvironment } from "@/lib/billing/haulmer/types";
import { formatRutForHaulmer } from "@/lib/billing/haulmer/rut";

const DEV_BASE = "https://dev-api.haulmer.com";
const PROD_BASE = "https://api.haulmer.com";

/** API key pública de OpenFactura (solo desarrollo / sandbox Haulmer). */
export const HAULMER_PUBLIC_DEV_API_KEY = "928e15a2d14d4a6292345f04960f4bd3";

export type HaulmerConfig = {
  enabled: boolean;
  environment: HaulmerEnvironment;
  apiKey: string | null;
  baseUrl: string;
  autoEmit: boolean;
  giroEmisor: string;
  acteco: number | null;
  cdgSiiSucur: string | null;
  emitterRut: string;
  emitterLegalName: string;
  emitterAddress: string;
  emitterCommune: string;
};

export function getHaulmerEnvironment(): HaulmerEnvironment {
  const raw = (process.env.HAULMER_ENV ?? process.env.HAULMER_ENVIRONMENT ?? "development")
    .trim()
    .toLowerCase();
  return raw === "production" || raw === "prod" ? "production" : "development";
}

export function getHaulmerConfig(): HaulmerConfig {
  const environment = getHaulmerEnvironment();
  const apiKey =
    process.env.HAULMER_API_KEY?.trim() ||
    (environment === "development" ? HAULMER_PUBLIC_DEV_API_KEY : null);

  const actecoRaw = process.env.HAULMER_ACTECO?.trim();
  const acteco = actecoRaw && /^\d+$/.test(actecoRaw) ? Number(actecoRaw) : null;

  return {
    enabled: process.env.HAULMER_DTE_ENABLED === "true" || process.env.HAULMER_DTE_ENABLED === "1",
    environment,
    apiKey,
    baseUrl: environment === "production" ? PROD_BASE : DEV_BASE,
    autoEmit:
      process.env.HAULMER_AUTO_EMIT === "true" || process.env.HAULMER_AUTO_EMIT === "1",
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
  return Boolean(config.apiKey);
}
