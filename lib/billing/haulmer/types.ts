export const HAULMER_DTE_TYPES = {
  facturaAfecta: 33,
  boletaAfecta: 39,
} as const;

export type HaulmerDteType =
  (typeof HAULMER_DTE_TYPES)[keyof typeof HAULMER_DTE_TYPES];

/** Alcance del documento tributario emitido por Impresiones Getsemaní. */
export type HaulmerDteScope = "service" | "commission";

export type HaulmerEnvironment = "development" | "production";

export type HaulmerEmitResponse = {
  TOKEN?: string;
  FOLIO?: number | string;
  TIMBRE?: string;
  PDF?: string;
  XML?: string;
  LOGO?: string;
  RESOLUCION?: unknown;
  WARNING?: Array<Record<string, string>>;
  error?: {
    message?: string;
    code?: string;
    details?: Array<{ field?: string; issue?: string }>;
  };
};

export type TaxDocumentStatus = "pending" | "issued" | "failed" | "skipped";

export type TaxDocumentRecord = {
  id: string;
  paymentId: string;
  provider: "haulmer";
  dteType: HaulmerDteType;
  scope: HaulmerDteScope;
  status: TaxDocumentStatus;
  folio: string | null;
  token: string | null;
  amountNet: number;
  amountTax: number;
  amountTotal: number;
  receptorRut: string;
  receptorName: string;
  financingNote: string | null;
  pdfBase64: string | null;
  errorMessage: string | null;
  issuedAt: string | null;
  createdAt: string;
};
