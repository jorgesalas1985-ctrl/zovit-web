export const PAYMENT_STATUSES = [
  "pendiente",
  "esperando_pago",
  "pago_recibido",
  "pago_retenido",
  "trabajo_en_ejecucion",
  "trabajo_finalizado",
  "esperando_aprobacion_cliente",
  "pago_liberado",
  "reembolsado",
  "cancelado",
  "en_disputa",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = [
  "mock",
  "webpay",
  "mercadopago",
  "stripe",
  "bank_transfer",
] as const;

export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export const PROPOSAL_STATUSES = ["pendiente", "aceptada", "rechazada", "retirada"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type PaymentBreakdown = {
  amountGross: number;
  platformFee: number;
  taxAmount: number;
  amountNet: number;
  currency: string;
};

export type PaymentRecord = {
  id: string;
  publicId: string;
  workOrderId: string;
  requestId: string;
  clientId: string;
  professionalId: string;
  amountGross: number;
  platformFee: number;
  taxAmount: number;
  amountNet: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProviderName;
  providerReference: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export type PaymentEvent = {
  id: string;
  paymentId: string;
  eventType: string;
  oldStatus: PaymentStatus | null;
  newStatus: PaymentStatus | null;
  amount: number | null;
  platformFee: number | null;
  taxAmount: number | null;
  paymentMethod: string | null;
  createdAt: string;
};

export type WalletSummary = {
  availableBalance: number;
  heldBalance: number;
  currency: string;
  totalReceived: number;
  totalFees: number;
};

export type ServiceProposal = {
  id: string;
  requestId: string;
  professionalId: string;
  amount: number;
  currency: string;
  description: string;
  estimatedHours: number | null;
  status: ProposalStatus;
  createdAt: string;
  professionalName?: string;
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  esperando_pago: "Esperando pago",
  pago_recibido: "Pago recibido",
  pago_retenido: "Pago retenido",
  trabajo_en_ejecucion: "Trabajo en ejecución",
  trabajo_finalizado: "Trabajo finalizado",
  esperando_aprobacion_cliente: "Esperando aprobación",
  pago_liberado: "Pago liberado",
  reembolsado: "Reembolsado",
  cancelado: "Cancelado",
  en_disputa: "En disputa",
};

export const PROVIDER_LABELS: Record<PaymentProviderName, string> = {
  mock: "Simulación ZOVIT",
  webpay: "Webpay Plus",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
  bank_transfer: "Transferencia bancaria",
};

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateBreakdown(amount: number): PaymentBreakdown {
  const platformFee = Math.round(amount * 0.1);
  const taxAmount = Math.round(platformFee * 0.19);
  const amountNet = Math.round(amount - platformFee - taxAmount);

  return {
    amountGross: amount,
    platformFee,
    taxAmount,
    amountNet,
    currency: "CLP",
  };
}
