import { normalizeCertificateFolio } from "@/lib/certificates/folio";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CertificateEmailDeliveryRequest = {
  folio: string;
  email: true;
  idempotencyKey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Accept only the fields used by the certificate email delivery endpoint. */
export function parseCertificateEmailDeliveryRequest(
  value: unknown,
): CertificateEmailDeliveryRequest | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (
    keys.length !== 3 ||
    !keys.every((key) => key === "folio" || key === "email" || key === "idempotencyKey")
  ) {
    return null;
  }

  if (typeof value.folio !== "string" || value.email !== true || typeof value.idempotencyKey !== "string") {
    return null;
  }

  const folio = normalizeCertificateFolio(value.folio);
  if (!folio || value.folio.trim().toUpperCase() !== folio) return null;
  if (!UUID_RE.test(value.idempotencyKey) || value.idempotencyKey !== value.idempotencyKey.toLowerCase()) {
    return null;
  }

  return { folio, email: true, idempotencyKey: value.idempotencyKey };
}
