import { getHaulmerConfig } from "@/lib/billing/haulmer/config";
import type { HaulmerEmitResponse } from "@/lib/billing/haulmer/types";

export class HaulmerApiError extends Error {
  code?: string;
  details?: HaulmerEmitResponse["error"];

  constructor(message: string, code?: string, details?: HaulmerEmitResponse["error"]) {
    super(message);
    this.name = "HaulmerApiError";
    this.code = code;
    this.details = details;
  }
}

export async function haulmerEmitDocument(input: {
  payload: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<HaulmerEmitResponse> {
  const config = getHaulmerConfig();
  if (!config.apiKey) {
    throw new HaulmerApiError(
      "Falta HAULMER_API_KEY. En desarrollo puedes usar la key pública de OpenFactura o dejar HAULMER_ENV=development.",
    );
  }

  const response = await fetch(`${config.baseUrl}/v2/dte/document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
      "Idempotency-Key": input.idempotencyKey.slice(0, 64),
    },
    body: JSON.stringify(input.payload),
  });

  const data = (await response.json().catch(() => ({}))) as HaulmerEmitResponse;

  if (!response.ok || data.error) {
    const details = data.error?.details
      ?.map((item) => `${item.field ?? "?"}: ${item.issue ?? ""}`)
      .join("; ");
    throw new HaulmerApiError(
      details
        ? `${data.error?.message ?? "Error Haulmer"} (${details})`
        : data.error?.message ?? `Error HTTP Haulmer ${response.status}`,
      data.error?.code,
      data.error,
    );
  }

  return data;
}
