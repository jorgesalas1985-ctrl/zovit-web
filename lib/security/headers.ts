import type { NextResponse } from "next/server";

function buildCsp(isProd: boolean): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://www.mercadopago.cl https://www.mercadopago.com https://*.mercadopago.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://www.mercadopago.com https://www.mercadopago.cl https://*.mercadopago.com",
    "frame-src 'self' https://www.mercadopago.cl https://www.mercadopago.com https://*.mercadopago.com",
  ];
  if (isProd) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** Baseline browser / proxy hardening for all responses. */
export function getSecurityHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === "production";
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self), payment=()",
    "X-DNS-Prefetch-Control": "off",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": buildCsp(isProd),
  };
  if (isProd) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}

/** @deprecated use getSecurityHeaders() — kept for next.config import shape */
export const SECURITY_HEADERS = getSecurityHeaders();

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(getSecurityHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}
