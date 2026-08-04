import { getAgeInYears, MIN_AGE_CHILE } from "@/lib/registration/age";
import { normalizeChileanRut } from "@/lib/registration/validateRegistration";
import { chileanDateToIso } from "@/lib/ui/chileanDate";
import { analyzeImagesWithLocalOcr } from "@/lib/verification/localCarnetOcr";

export type AiForgeryRisk = "low" | "medium" | "high";
export type IdentityAiDecision = "approved" | "rejected" | "dudoso";

export type CarnetOcrInput = {
  declaredRut: string;
  declaredBirthDate: string; // ISO or Chilean
  firstName?: string | null;
  lastName?: string | null;
  files: Array<{
    label: string;
    mime: string;
    base64: string;
  }>;
};

export type CarnetOcrVerdict = {
  decision: IdentityAiDecision;
  confidence: number;
  forgeryRisk: AiForgeryRisk;
  summary: string;
  userMessage: string;
  extractedRut: string | null;
  extractedBirthDate: string | null; // ISO yyyy-mm-dd
  rutMatches: boolean;
  birthDateMatches: boolean;
  isAdult: boolean;
  model: string;
  reasons: string[];
};

const APPROVE_MIN = 0.85;


export function decideCarnetVerdict(input: {
  confidence: number;
  forgeryRisk: AiForgeryRisk;
  rutMatches: boolean;
  birthDateMatches: boolean;
  isAdult: boolean;
  hasImages: boolean;
  extractedRut: string | null;
  extractedBirthDate: string | null;
}): IdentityAiDecision {
  if (!input.hasImages) return "dudoso";
  if (input.forgeryRisk === "high") return "rejected";
  if (input.extractedRut && !input.rutMatches) return "rejected";
  if (input.extractedBirthDate && !input.isAdult) return "rejected";
  if (input.extractedBirthDate && !input.birthDateMatches) return "rejected";
  if (input.forgeryRisk === "medium") return "dudoso";
  if (
    input.rutMatches &&
    input.birthDateMatches &&
    input.isAdult &&
    input.forgeryRisk === "low" &&
    input.confidence >= APPROVE_MIN
  ) {
    return "approved";
  }
  if (input.confidence < 0.4) return "rejected";
  return "dudoso";
}

export async function analyzeCarnetWithOpenAI(
  input: CarnetOcrInput,
  _options?: { apiKey?: string; model?: string },
): Promise<CarnetOcrVerdict> {
  const imageFiles = input.files.filter((f) => f.mime.startsWith("image/"));
  const declaredRut = normalizeChileanRut(input.declaredRut);
  const declaredBirthIso = input.declaredBirthDate
    ? chileanDateToIso(input.declaredBirthDate)
    : null;

  if (imageFiles.length === 0) {
    return {
      decision: "dudoso",
      confidence: 0.2,
      forgeryRisk: "medium",
      summary: "No hay imagen usable del carnet (solo PDF u otro formato).",
      userMessage: "Sube fotos claras del carnet (frontal y reverso) en JPG o PNG.",
      extractedRut: null,
      extractedBirthDate: null,
      rutMatches: false,
      birthDateMatches: false,
      isAdult: false,
      model: "rules-no-image",
      reasons: ["Sin imagen del carnet"],
    };
  }

  const local = await analyzeImagesWithLocalOcr(imageFiles);
  const extractedRut = local.extractedRut;
  const extractedBirthDate = local.extractedBirthDate;
  const confidence = local.confidence;
  const looksLikeId = local.documentLooksLikeChileanId;
  const forgeryRisk: AiForgeryRisk = looksLikeId ? local.forgeryRisk : "high";

  const rutMatches = Boolean(
    extractedRut && declaredRut && extractedRut === normalizeChileanRut(declaredRut),
  );
  const age = extractedBirthDate ? getAgeInYears(extractedBirthDate) : null;
  const isAdult = age != null && age >= MIN_AGE_CHILE;
  const birthDateMatches = declaredBirthIso
    ? Boolean(extractedBirthDate && extractedBirthDate === declaredBirthIso)
    : !extractedBirthDate || isAdult;

  const decision = decideCarnetVerdict({
    confidence,
    forgeryRisk,
    rutMatches,
    birthDateMatches,
    isAdult,
    hasImages: true,
    extractedRut,
    extractedBirthDate,
  });

  const reasons = [...local.reasons];
  if (!rutMatches && extractedRut) {
    reasons.push(`RUT del carnet (${extractedRut}) ≠ declarado (${declaredRut})`);
  }
  if (declaredBirthIso && !birthDateMatches && extractedBirthDate) {
    reasons.push(
      `Fecha del carnet (${extractedBirthDate}) ≠ declarada (${declaredBirthIso})`,
    );
  }
  if (extractedBirthDate && !isAdult) {
    reasons.push(`Menor de ${MIN_AGE_CHILE} años según carnet`);
  }

  return {
    decision,
    confidence,
    forgeryRisk,
    summary: `OCR local: ${reasons.slice(0, 3).join(" · ") || "Validación de carnet."}`,
    userMessage:
      decision === "approved"
        ? "Tu identidad fue verificada automáticamente con tu carnet."
        : decision === "rejected"
          ? "No pudimos validar tu carnet. Revisa que el RUT y la fecha coincidan con el documento y vuelve a subir fotos claras."
          : "Tu carnet requiere una revisión adicional. Te avisaremos pronto.",
    extractedRut,
    extractedBirthDate,
    rutMatches,
    birthDateMatches,
    isAdult,
    model: "tesseract-local",
    reasons,
  };
}
