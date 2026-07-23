import { getAppBaseUrl } from "@/lib/payments/appUrl";

export function getAuthCallbackUrl(nextPath = "/panel"): string {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${getAppBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function getRedirectOrigin(fallbackOrigin: string): string {
  return getAppBaseUrl() || fallbackOrigin;
}
