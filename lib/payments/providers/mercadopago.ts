import {
  getAppBaseUrl,
  getMercadoPagoBackUrls,
  getMercadoPagoWebhookUrl,
} from "@/lib/payments/appUrl";
import type {
  CreatePaymentSessionInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  PaymentSession,
  WebhookResult,
} from "@/lib/payments/providers/interface";

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

type MercadoPagoPaymentResponse = {
  id: number;
  status: string;
  external_reference?: string;
  payment_method_id?: string;
};

export class MercadoPagoProvider implements PaymentProviderAdapter {
  readonly name = "mercadopago" as const;

  private getAccessToken(): string {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en variables de entorno.");
    }
    return token;
  }

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSession> {
    const token = this.getAccessToken();
    const backUrls = getMercadoPagoBackUrls(input.publicId);
    const title = input.metadata?.requestId
      ? `Servicio ZOVIT ${input.publicId}`
      : `Pago ZOVIT ${input.publicId}`;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title,
            quantity: 1,
            unit_price: input.amount,
            currency_id: input.currency === "CLP" ? "CLP" : input.currency,
          },
        ],
        payer: input.clientEmail ? { email: input.clientEmail } : undefined,
        external_reference: input.publicId,
        back_urls: backUrls,
        auto_return: "approved",
        notification_url: getMercadoPagoWebhookUrl(),
        metadata: {
          payment_id: input.paymentId,
          request_id: input.metadata?.requestId ?? "",
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mercado Pago no pudo crear la preferencia: ${errorBody}`);
    }

    const preference = (await response.json()) as MercadoPagoPreferenceResponse;
    const isTestToken = token.startsWith("TEST-");
    const redirectUrl = isTestToken
      ? preference.sandbox_init_point ?? preference.init_point
      : preference.init_point ?? preference.sandbox_init_point;

    if (!redirectUrl) {
      throw new Error("Mercado Pago no devolvió URL de checkout.");
    }

    return {
      provider: "mercadopago",
      sessionId: preference.id,
      reference: preference.id,
      redirectUrl,
    };
  }

  async capture(reference: string): Promise<PaymentProviderResult> {
    const payment = await this.fetchPayment(reference);
    return {
      success: payment.status === "approved",
      reference,
      status: payment.status === "approved" ? "captured" : "failed",
      raw: payment,
    };
  }

  async refund(reference: string): Promise<PaymentProviderResult> {
    return {
      success: false,
      reference,
      status: "failed",
      raw: { message: "Reembolso Mercado Pago pendiente de implementación." },
    };
  }

  async parseWebhook(payload: unknown): Promise<WebhookResult> {
    const body = payload as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };

    const mpPaymentId = body.data?.id;
    if (!mpPaymentId) {
      return { reference: "unknown", status: "failed" };
    }

    const payment = await this.fetchPayment(String(mpPaymentId));
    const externalReference = payment.external_reference ?? "unknown";

    if (payment.status === "approved") {
      return {
        reference: String(payment.id),
        externalReference: payment.external_reference,
        status: "paid",
        paymentMethod: payment.payment_method_id ?? "mercadopago",
      };
    }

    if (["rejected", "cancelled"].includes(payment.status)) {
      return {
        reference: externalReference,
        externalReference: payment.external_reference,
        status: "failed",
      };
    }

    return {
      reference: externalReference,
      externalReference: payment.external_reference,
      status: "pending",
      paymentMethod: "mercadopago",
    };
  }

  private async fetchPayment(paymentId: string): Promise<MercadoPagoPaymentResponse> {
    const token = this.getAccessToken();
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`No se pudo consultar el pago ${paymentId} en Mercado Pago.`);
    }

    return (await response.json()) as MercadoPagoPaymentResponse;
  }
}

export async function syncMercadoPagoReturn(params: {
  externalReference: string;
  mercadoPagoPaymentId?: string;
  collectionStatus?: string;
}): Promise<{ shouldRegister: boolean; reference: string; paymentMethod: string }> {
  const provider = new MercadoPagoProvider();
  const approved =
    params.collectionStatus === "approved" ||
    params.collectionStatus === "authorized";

  if (params.mercadoPagoPaymentId) {
    const result = await provider.capture(params.mercadoPagoPaymentId);
    return {
      shouldRegister: result.success,
      reference: params.mercadoPagoPaymentId,
      paymentMethod: "mercadopago",
    };
  }

  return {
    shouldRegister: approved,
    reference: params.externalReference,
    paymentMethod: "mercadopago",
  };
}

export function validateMercadoPagoPublicUrl(): string | null {
  const base = getAppBaseUrl();
  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return "Mercado Pago no acepta localhost en back_urls. Usa NEXT_PUBLIC_APP_URL con un dominio público (ngrok, staging o producción).";
  }
  return null;
}
