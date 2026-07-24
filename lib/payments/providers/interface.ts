import type { PaymentProviderName } from "@/lib/payments/types";

export type CreatePaymentSessionInput = {
  paymentId: string;
  publicId: string;
  amount: number;
  currency: string;
  clientEmail?: string;
  returnUrl: string;
  metadata?: Record<string, string>;
};

export type PaymentSession = {
  provider: PaymentProviderName;
  sessionId: string;
  redirectUrl?: string;
  reference: string;
  expiresAt?: string;
};

export type PaymentProviderResult = {
  success: boolean;
  reference: string;
  status: "authorized" | "captured" | "failed" | "refunded";
  raw?: unknown;
};

export type WebhookResult = {
  paymentId?: string;
  externalReference?: string;
  reference: string;
  status: "paid" | "failed" | "refunded" | "pending";
  paymentMethod?: string;
  mercadoPagoPayment?: {
    status: string;
    external_reference?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
};

export interface PaymentProviderAdapter {
  readonly name: PaymentProviderName;
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSession>;
  capture(reference: string): Promise<PaymentProviderResult>;
  refund(reference: string, amount?: number): Promise<PaymentProviderResult>;
  parseWebhook(payload: unknown, headers: Headers, url?: URL): Promise<WebhookResult>;
}
