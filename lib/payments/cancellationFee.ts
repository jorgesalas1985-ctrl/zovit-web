/** Cargo mínimo por cancelar una solicitud (CLP). */
export const CANCELLATION_FEE_CLP = 3000;

export const CANCELLATION_FEE_REASON_LABELS: Record<string, string> = {
  after_proposal: "Había propuestas de profesionales",
  after_accept: "Ya había profesional asignado",
  after_payment: "Ya existía un pago en ZOVIT",
  repeat_cancel: "Cancelaciones repetidas en el mes",
  free_publicada: "Cancelación gratuita (publicada sin propuestas)",
  retenida_escrow: "Descontado del pago retenido",
};

export type CancellationFeePreview = {
  feeAmount: number;
  feeApplies: boolean;
  reason: string | null;
  reasonLabel: string;
  hasHeldPayment: boolean;
};
