import { createHmac, timingSafeEqual } from "crypto";
import {
  getAppBaseUrl,
  getMercadoPagoBackUrls,
  getMercadoPagoWebhookUrl,
} from "@/lib/payments/appUrl";
import type { MercadoPagoPaymentDetails } from "@/lib/payments/confirmPayment";
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
  transaction_amount?: number;
  currency_id?: string;
};

export class MercadoPagoWebhookSignatureError extends Error {
  constructor(message = "Firma de webhook Mercado Pago inválida.") {
    super(message);
    this.name = "MercadoPagoWebhookSignatureError";
  }
}

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

  async parseWebhook(payload: unknown, headers: Headers, url?: URL): Promise<WebhookResult> {
    validateMercadoPagoWebhookSignature(headers, url);

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
        mercadoPagoPayment: toMercadoPagoPaymentDetails(payment),
      };
    }

    if (["rejected", "cancelled"].includes(payment.status)) {
      return {
        reference: externalReference,
        externalReference: payment.external_reference,
        status: "failed",
        mercadoPagoPayment: toMercadoPagoPaymentDetails(payment),
      };
    }

    return {
      reference: externalReference,
      externalReference: payment.external_reference,
      status: "pending",
      paymentMethod: "mercadopago",
      mercadoPagoPayment: toMercadoPagoPaymentDetails(payment),
    };
  }

  async fetchPayment(paymentId: string): Promise<MercadoPagoPaymentResponse> {
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

function toMercadoPagoPaymentDetails(payment: MercadoPagoPaymentResponse): MercadoPagoPaymentDetails {
  return {
    status: payment.status,
    external_reference: payment.external_reference,
    transaction_amount: payment.transaction_amount,
    currency_id: payment.currency_id,
  };
}

export function validateMercadoPagoWebhookSignature(headers: Headers, url?: URL): void {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new MercadoPagoWebhookSignatureError("Falta MERCADOPAGO_WEBHOOK_SECRET.");
    }
    return;
  }

  const xSignature = headers.get("x-signature");
  if (!xSignature) {
    throw new MercadoPagoWebhookSignatureError();
  }

  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key?.trim() === "ts") ts = value?.trim() ?? "";
    if (key?.trim() === "v1") v1 = value?.trim() ?? "";
  }

  if (!ts || !v1) {
    throw new MercadoPagoWebhookSignatureError();
  }

  const dataId = url?.searchParams.get("data.id") ?? url?.searchParams.get("data_id") ?? "";
  const xRequestId = headers.get("x-request-id") ?? "";

  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(v1);
  const computed = Buffer.from(expected);

  if (received.length !== computed.length || !timingSafeEqual(received, computed)) {
    throw new MercadoPagoWebhookSignatureError();
  }
}

export async function syncMercadoPagoReturn(params: {
  externalReference: string;
  mercadoPagoPaymentId?: string;
  collectionStatus?: string;
}): Promise<{
  shouldRegister: boolean;
  reference: string;
  paymentMethod: string;
  mercadoPagoPayment?: MercadoPagoPaymentDetails;
}> {
  const provider = new MercadoPagoProvider();

  if (!params.mercadoPagoPaymentId) {
    return {
      shouldRegister: false,
      reference: params.externalReference,
      paymentMethod: "mercadopago",
    };
  }

  const payment = await provider.fetchPayment(params.mercadoPagoPaymentId);
  const mercadoPagoPayment = toMercadoPagoPaymentDetails(payment);

  return {
    shouldRegister: payment.status === "approved",
    reference: params.mercadoPagoPaymentId,
    paymentMethod: payment.payment_method_id ?? "mercadopago",
    mercadoPagoPayment,
  };
}

export function validateMercadoPagoPublicUrl(): string | null {
  const base = getAppBaseUrl();
  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return "Mercado Pago no acepta localhost en back_urls. Usa NEXT_PUBLIC_APP_URL con un dominio público (ngrok, staging o producción).";
  }
  return null;
}
