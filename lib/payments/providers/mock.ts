import type {
  CreatePaymentSessionInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  PaymentSession,
  WebhookResult,
} from "@/lib/payments/providers/interface";

export class MockPaymentProvider implements PaymentProviderAdapter {
  readonly name = "mock" as const;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSession> {
    const reference = `MOCK-${input.publicId}-${Date.now()}`;
    return {
      provider: "mock",
      sessionId: reference,
      reference,
      redirectUrl: `${input.returnUrl}?mock_ref=${encodeURIComponent(reference)}`,
    };
  }

  async capture(reference: string): Promise<PaymentProviderResult> {
    return { success: true, reference, status: "captured" };
  }

  async refund(reference: string): Promise<PaymentProviderResult> {
    return { success: true, reference, status: "refunded" };
  }

  async parseWebhook(payload: unknown, _headers: Headers): Promise<WebhookResult> {
    const body = payload as { reference?: string; paymentId?: string; status?: string };
    return {
      paymentId: body.paymentId,
      reference: body.reference ?? "unknown",
      status: body.status === "failed" ? "failed" : "paid",
      paymentMethod: "mock",
    };
  }
}
