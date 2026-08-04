/**
 * Proveedor de IA opcional (desactivado por producto).
 * La verificación de carnet usa OCR local (Tesseract), sin OpenAI ni Gemini.
 */

export type AiProvider = "local" | "openai" | "gemini";

export type AiChatPart =
  | { type: "text"; text: string }
  | { type: "image"; mime: string; base64: string; label?: string };

export type AiChatResult = {
  text: string;
  provider: AiProvider;
  model: string;
};

/** Siempre disponible: OCR local en el servidor. */
export function isAiConfigured(): boolean {
  return true;
}

export function missingAiKeyMessage(): string {
  return "El OCR local no pudo procesar el documento. Revisa que las fotos del carnet sean claras.";
}

export function resolveAiProvider(): {
  configured: boolean;
  provider: AiProvider;
  apiKey: string | null;
  model: string;
} {
  return {
    configured: true,
    provider: "local",
    apiKey: null,
    model: "tesseract-local",
  };
}

/** Texto de ayuda: ya no usamos APIs externas de visión. */
export async function chatWithVision(_params: {
  system: string;
  parts: AiChatPart[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<AiChatResult> {
  throw new Error(
    "Las APIs externas de visión están desactivadas. Usa el OCR local de verificación de identidad.",
  );
}
