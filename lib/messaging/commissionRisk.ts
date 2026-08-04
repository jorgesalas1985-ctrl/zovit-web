/**
 * Señales client-side de posible elusión de comisión ZOVIT
 * (declarar monto menor / cobrar el resto fuera).
 */

const MONEY_PATTERNS = [
  /\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+)\b/g,
  /\$\s*([0-9]{4,7})\b/g,
  /\b([0-9]{4,7})\s*(?:pesos|clp|lucas)\b/gi,
];

const EVASION_PHRASE =
  /\b(menos\s*comisi[oó]n|bajar\s*comisi|fuera\s*de\s*zovit|cobro\s*aparte|resto\s*en\s*efectivo|el\s*resto\s*afuera|monto\s*menor\s*en\s*(la\s*)?(app|zovit)|te\s*rebajo|pon(e|emos)?\s*menos)\b/i;

export function extractMaxMoneyAmount(text: string): number | null {
  let max = 0;
  for (const pattern of MONEY_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1] ?? match[0];
      const value = Number(String(raw).replace(/\./g, "").replace(/[^\d]/g, ""));
      if (Number.isFinite(value) && value >= 5000 && value <= 5_000_000 && value > max) {
        max = value;
      }
    }
  }
  return max > 0 ? max : null;
}

export function detectCommissionEvasionPhrase(text: string): boolean {
  return EVASION_PHRASE.test(text);
}

export function commissionMismatch(
  chatAmount: number | null,
  officialAmount: number | null | undefined,
): boolean {
  if (!chatAmount || !officialAmount || officialAmount < 1000) return false;
  return chatAmount >= officialAmount * 1.25 || chatAmount - officialAmount >= 15_000;
}

export const COMMISSION_SAFETY_NOTICE =
  "El monto real del trabajo debe registrarse y pagarse en ZOVIT. Declarar un monto menor para reducir la comisión o solicitar pagos fuera de la app puede generar bloqueos y afectar tu cuenta.";
