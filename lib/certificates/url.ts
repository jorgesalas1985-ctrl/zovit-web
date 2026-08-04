import { getAppBaseUrl } from "@/lib/payments/appUrl";

export function getCertificatePublicUrl(folio: string): string {
  return `${getAppBaseUrl()}/certificados/${encodeURIComponent(folio)}`;
}

export function getCertificateValidateHubUrl(): string {
  return `${getAppBaseUrl()}/certificados/validar`;
}
