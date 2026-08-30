import { getAgeInYears, MIN_AGE_CHILE } from "@/lib/registration/age";
import { normalizeChileanRut } from "@/lib/registration/validateRegistration";
import { chileanDateToIso } from "@/lib/ui/chileanDate";
import { analyzeImagesWithLocalOcr, type LocalDocumentAssessment } from "@/lib/verification/localCarnetOcr";

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
  extractedExpiryDate: string | null;
  nameMatches: boolean | null;
  carnetExpired?: boolean | null;
  faceReviewRequired: boolean;
  documentAssessments: LocalDocumentAssessment[];
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
  carnetExpired?: boolean | null;
}): IdentityAiDecision {
  if (!input.hasImages) return "dudoso";
  if (input.forgeryRisk === "high") return "rejected";
  if (input.extractedRut && !input.rutMatches) return "rejected";
  if (input.extractedBirthDate && !input.isAdult) return "rejected";
  if (input.extractedBirthDate && !input.birthDateMatches) return "rejected";
  if (input.carnetExpired) return "rejected";
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
      extractedExpiryDate: null, nameMatches: null, carnetExpired: null, faceReviewRequired: true,
      documentAssessments: [],
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
  const extractedExpiryDate = local.extractedExpiryDate;
  const confidence = local.confidence;
  const looksLikeId = local.documentLooksLikeChileanId;
  // Una imagen que no acredita estructura de cédula no se aprueba sola: queda dudosa
  // para la persona administradora. Las señales explícitas de captura/fraude siguen
  // siendo riesgo alto.
  const forgeryRisk: AiForgeryRisk = local.forgeryRisk;

  const rutMatches = Boolean(
    extractedRut && declaredRut && extractedRut === normalizeChileanRut(declaredRut),
  );
  const age = extractedBirthDate ? getAgeInYears(extractedBirthDate) : null;
  const isAdult = age != null && age >= MIN_AGE_CHILE;
  const birthDateMatches = declaredBirthIso
    ? Boolean(extractedBirthDate && extractedBirthDate === declaredBirthIso)
    : !extractedBirthDate || isAdult;
  const normalizedText = local.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const declaredNameWords = `${input.firstName ?? ""} ${input.lastName ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\s+/).filter((word) => word.length >= 3);
  const nameMatches = declaredNameWords.length ? declaredNameWords.every((word) => normalizedText.includes(word)) : null;
  const carnetExpired = extractedExpiryDate ? new Date(`${extractedExpiryDate}T23:59:59`).getTime() < Date.now() : null;

  const decision = decideCarnetVerdict({
    confidence,
    forgeryRisk,
    rutMatches,
    birthDateMatches,
    isAdult,
    hasImages: true,
    extractedRut,
    extractedBirthDate,
    carnetExpired,
  });

  const reasons = [...local.reasons];
  reasons.push(`Calidad OCR ${Math.round(local.ocrConfidence)}% · ${local.sidesRead} cara(s) legible(s)`);
  if (!looksLikeId || !local.identityStructureConfirmed) {
    reasons.push("No se confirmó que la imagen sea una cédula chilena completa");
  }
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
  if (nameMatches === false) reasons.push("El nombre declarado no se reconoce completo en el texto del carnet");
  if (carnetExpired) reasons.push("El carnet parece estar vencido");
  reasons.push("Selfie y prueba de vida: comparación facial requiere revisión humana");

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
    extractedExpiryDate,
    nameMatches,
    carnetExpired,
    faceReviewRequired: true,
    documentAssessments: local.documentAssessments,
    rutMatches,
    birthDateMatches,
    isAdult,
    model: "tesseract-local-advanced-v3",
    reasons,
  };
}
