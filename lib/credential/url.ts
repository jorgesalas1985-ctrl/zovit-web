import { getAppBaseUrl } from "@/lib/payments/appUrl";

export function getCredentialPublicUrl(userId: string): string {
  return `${getAppBaseUrl()}/credencial/${userId}`;
}
