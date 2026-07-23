import type { PaymentProviderAdapter } from "@/lib/payments/providers/interface";
import { MercadoPagoProvider } from "@/lib/payments/providers/mercadopago";
import { MockPaymentProvider } from "@/lib/payments/providers/mock";
import type { PaymentProviderName } from "@/lib/payments/types";

function notImplemented(name: string): PaymentProviderAdapter {
  return {
    name: name as PaymentProviderName,
    async createSession() {
      throw new Error(`${name} aún no está integrado. Usa mock en desarrollo.`);
    },
    async capture() {
      throw new Error(`${name} aún no está integrado.`);
    },
    async refund() {
      throw new Error(`${name} aún no está integrado.`);
    },
    async parseWebhook() {
      throw new Error(`${name} webhook aún no está integrado.`);
    },
  };
}

const providers: Record<PaymentProviderName, PaymentProviderAdapter> = {
  mock: new MockPaymentProvider(),
  webpay: notImplemented("webpay"),
  mercadopago: new MercadoPagoProvider(),
  stripe: notImplemented("stripe"),
  bank_transfer: notImplemented("bank_transfer"),
};

export function getPaymentProvider(name: PaymentProviderName): PaymentProviderAdapter {
  return providers[name] ?? providers.mock;
}

export function getDefaultPaymentProvider(): PaymentProviderAdapter {
  const configured = process.env.ZOVIT_PAYMENT_PROVIDER as PaymentProviderName | undefined;
  return getPaymentProvider(configured ?? "mock");
}
