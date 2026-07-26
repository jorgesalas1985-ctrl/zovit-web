/**
 * Evita que cliente y profesional se pasen teléfono / WhatsApp / email
 * antes del pago protegido (protege la comisión y la seguridad del escrow).
 */

const PHONE_LIKE =
  /(?:\+?56[\s\-.]*)?(?:9[\s\-.]*)?\d{4}[\s\-.]?\d{4}|\b\d{8,11}\b/gi;
const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const HANDLE_LIKE =
  /\b(?:whats?app|wsp|wasap|telegram|instagram|ig|facebook|fb|llamar|llámame|llamame|escríbeme|escribeme|al\s*cel|mi\s*número|mi\s*numero)\b/gi;

export type ContactFilterResult = {
  sanitized: string;
  blocked: boolean;
  reasons: string[];
};

export function filterContactLeaks(raw: string): ContactFilterResult {
  const reasons: string[] = [];
  let sanitized = raw;

  if (EMAIL_LIKE.test(sanitized)) {
    reasons.push("correo");
    sanitized = sanitized.replace(EMAIL_LIKE, "[contacto oculto]");
  }
  EMAIL_LIKE.lastIndex = 0;

  if (PHONE_LIKE.test(sanitized)) {
    reasons.push("teléfono");
    sanitized = sanitized.replace(PHONE_LIKE, "[contacto oculto]");
  }
  PHONE_LIKE.lastIndex = 0;

  if (HANDLE_LIKE.test(sanitized)) {
    reasons.push("redes/WhatsApp");
    sanitized = sanitized.replace(HANDLE_LIKE, "[coordina en ZOVIT]");
  }
  HANDLE_LIKE.lastIndex = 0;

  return {
    sanitized: sanitized.trim(),
    blocked: reasons.length > 0,
    reasons,
  };
}

export const CHAT_SAFETY_NOTICE =
  "Por tu seguridad y para proteger el pago, coordina solo en ZOVIT. No compartas teléfono, WhatsApp ni correo hasta que el cliente pague. Si se detecta elusión, la cuenta puede ser bloqueada.";
