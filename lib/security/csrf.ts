/**
 * Reject cross-site state-changing requests that omit/forge Origin/Referer.
 * Allows same-origin browser calls and server-to-server without Origin (webhooks).
 */
export function assertSameOrigin(request: Request): { ok: true } | { ok: false; error: string } {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }
  allowed.add("https://zovit.cl");
  allowed.add("https://www.zovit.cl");

  const origin = request.headers.get("origin");
  if (origin) {
    if (allowed.has(origin)) return { ok: true };
    // Vercel preview / alias deployments
    if (/^https:\/\/([a-z0-9-]+\.)+vercel\.app$/i.test(origin) && origin === new URL(request.url).origin) {
      return { ok: true };
    }
    // Local/LAN: el Host del request a veces no coincide 1:1 con Origin (localhost vs 127.0.0.1 / IP de red).
    if (isLocalDevPair(origin, request.url)) return { ok: true };
    return { ok: false, error: "Origen no permitido." };
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.has(refOrigin)) return { ok: true };
      return { ok: false, error: "Referer no permitido." };
    } catch {
      return { ok: false, error: "Referer inválido." };
    }
  }

  // No Origin/Referer: allow (native apps, server jobs, some webhooks).
  return { ok: true };
}

export function csrfDeniedResponse(error: string) {
  return Response.json({ error }, { status: 403 });
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);
}

/** Same-machine / LAN origins talking to a local Next server. */
export function isLocalDevPair(origin: string, requestUrl: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const originUrl = new URL(origin);
    const reqUrl = new URL(requestUrl);
    if (originUrl.protocol !== "http:" || reqUrl.protocol !== "http:") return false;
    return isLocalHostname(originUrl.hostname) && isLocalHostname(reqUrl.hostname);
  } catch {
    return false;
  }
}
