/**
 * Datos tributarios del emisor ZOVIT (Impresiones Getsemaní).
 * Cobros POS / facturación electrónica vía Haulmer.
 */

export const ZOVIT_ISSUER = {
  tradeName: "Impresiones Getsemaní",
  legalName:
    "IMPRESIONES JORGE ANDRES SALAS GUZMAN EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA",
  rut: "77.057.636-9",
  rutDigits: "770576369",
  address: "GETSEMANI 0301 J. DE NAZARET LT D, PUENTE ALTO",
  commune: "Puente Alto",
  email: "jorge_salas1985@hotmail.com",
  taxRegime: "REGIMEN PRO PYME GENERAL (14D)",
  /** Máquina / pasarela de boleta electrónica que usan hoy. */
  posProvider: "haulmer",
  posProviderLabel: "Haulmer",
} as const;

export const HAULMER_INTEGRATION_NOTES = {
  /** Emisor de documentos tributarios del servicio/comisión ZOVIT. */
  issuerRut: ZOVIT_ISSUER.rut,
  /**
   * El financiamiento de cuotas NO se emite como venta Haulmer/ZOVIT:
   * lo cobra la entidad financiera de la tarjeta.
   */
  excludeCardFinancingFromDte: true,
  /** API: OpenFactura (Haulmer) — ver lib/billing/haulmer y SPRINT_18_HAULMER_DTE.sql */
  openFacturaDocs: "https://docsapi-openfactura.haulmer.com/",
} as const;
