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
