import { createWorker, type Worker } from "tesseract.js";
import sharp from "sharp";
import {
  isValidChileanRut,
  normalizeChileanRut,
} from "@/lib/registration/validateRegistration";
import { chileanDateToIso } from "@/lib/ui/chileanDate";

export type LocalOcrExtract = {
  text: string;
  extractedRut: string | null;
  extractedBirthDate: string | null;
  extractedExpiryDate: string | null;
  documentLooksLikeChileanId: boolean;
  forgeryRisk: "low" | "medium" | "high";
  confidence: number;
  reasons: string[];
  ocrConfidence: number;
  sidesRead: number;
  identityStructureConfirmed: boolean;
  qualityWarnings: string[];
  documentAssessments: LocalDocumentAssessment[];
};

export type LocalDocumentAssessment = {
  label: string;
  looksLikeChileanId: boolean;
  confidence: number;
  reasons: string[];
};

const FAKE_DOC_HINTS = [
  "gmail",
  "tenpo",
  "tu caso ha sido resuelto",
  "outlook",
  "whatsapp",
  "instagram",
  "facebook",
  "screenshot",
  "captura de pantalla",
];

const ID_HINTS = [
  "run",
  "rut",
  "cedula",
  "cédula",
  "nacionalidad",
  "chile",
  "chl",
  "nacimiento",
  "documento",
  "identidad",
  "apellido",
  "nombres",
];

let workerPromise: Promise<Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("spa+eng", 1, {
        // Evita logs ruidosos en Vercel
        logger: () => undefined,
      });
      return worker;
    })();
  }
  return workerPromise;
}

export function extractRutFromText(text: string): string | null {
  const cleaned = text
    .replace(/[Oo](?=\d)/g, "0")
    .replace(/(?<=\d)[Oo]/g, "0")
    .replace(/[Il](?=\d)/g, "1")
    .replace(/(?<=\d)[Il]/g, "1");
  const candidates = cleaned.match(/\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}\s*[-–—]?\s*[\dkK]\b/g) ?? [];

  for (const raw of candidates) {
    const normalized = normalizeChileanRut(raw.replace(/\s+/g, ""));
    if (isValidChileanRut(normalized)) return normalized;
  }
  return null;
}

export function extractBirthDateFromText(text: string): string | null {
  const patterns = [
    /\b(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\b/g,
    /\b(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})\b/g,
    /\b(\d{2})\s+(?:de\s+)?(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+(?:de\s+)?(\d{4})\b/gi,
  ];

  const nearBirth = /nacim|fecha|birth|f\.?\s*nac/i.test(text);
  const found: string[] = [];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(text)) !== null) {
      const raw = match[0];
      const iso = chileanDateToIso(raw) ?? tryIsoParts(match) ?? trySpanishMonth(match);
      if (iso) found.push(iso);
    }
  }

  if (found.length === 0) return null;
  // Prefer dates that look like birth years (1930–2015)
  const plausible = found.filter((iso) => {
    const year = Number(iso.slice(0, 4));
    return year >= 1930 && year <= 2015;
  });
  const pool = plausible.length ? plausible : found;
  if (nearBirth && pool[0]) return pool[0];
  return pool[0] ?? null;
}

/** En una cédula vigente la fecha más futura suele corresponder al vencimiento. */
export function extractExpiryDateFromText(text: string): string | null {
  const dates = text.match(/\b\d{2}[\/\-.]\d{2}[\/\-.]\d{4}\b/g) ?? [];
  const today = new Date();
  const candidates = dates
    .map((value) => chileanDateToIso(value))
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const year = Number(value.slice(0, 4));
      return year >= today.getFullYear() - 1 && year <= today.getFullYear() + 20;
    })
    .sort();
  return candidates.at(-1) ?? null;
}

function trySpanishMonth(match: RegExpExecArray): string | null {
  const months: Record<string, string> = { ene:"01", febrero:"02", feb:"02", mar:"03", abr:"04", may:"05", jun:"06", jul:"07", ago:"08", sep:"09", octubre:"10", oct:"10", noviembre:"11", nov:"11", diciembre:"12", dic:"12" };
  const key = match[2]?.toLowerCase().slice(0, 3);
  const month = months[key];
  if (!month || !match[1] || !match[3]) return null;
  const iso = `${match[3]}-${month}-${match[1]}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

function tryIsoParts(match: RegExpExecArray): string | null {
  if (match[1]?.length === 4) {
    const iso = `${match[1]}-${match[2]}-${match[3]}`;
    return chileanDateToIso(iso);
  }
  const iso = chileanDateToIso(`${match[1]}/${match[2]}/${match[3]}`);
  return iso;
}

export function scoreDocumentText(text: string): Pick<
  LocalOcrExtract,
  "documentLooksLikeChileanId" | "forgeryRisk" | "confidence" | "reasons"
> {
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  const fakeHits = FAKE_DOC_HINTS.filter((h) => lower.includes(h));
  const idHits = ID_HINTS.filter((h) => lower.includes(h));

  if (fakeHits.length) {
    reasons.push(`La imagen parece captura ajena (${fakeHits.slice(0, 2).join(", ")})`);
    return {
      documentLooksLikeChileanId: false,
      forgeryRisk: "high",
      confidence: 0.15,
      reasons,
    };
  }

  const looksLikeId = idHits.length >= 2 || (idHits.length >= 1 && /\brun\b|\brut\b/i.test(text));
  if (!looksLikeId) {
    reasons.push("No se reconocen indicios claros de cédula chilena");
    return {
      documentLooksLikeChileanId: false,
      forgeryRisk: "medium",
      confidence: 0.35,
      reasons,
    };
  }

  reasons.push("OCR local detectó indicios de cédula chilena");
  return {
    documentLooksLikeChileanId: true,
    forgeryRisk: "low",
    confidence: Math.min(0.93, 0.55 + idHits.length * 0.08),
    reasons,
  };
}

type PreparedOcrImage = {
  original: Buffer;
  enhanced: Buffer;
  qualityWarnings: string[];
};

/** Normaliza rotación, contraste y resolución antes de OCR; nunca modifica el archivo original guardado. */
async function prepareImageForOcr(base64: string): Promise<PreparedOcrImage> {
  const original = Buffer.from(base64, "base64");
  const qualityWarnings: string[] = [];
  try {
    const source = sharp(original, { failOn: "none" }).rotate();
    const metadata = await source.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < 900 || height < 550) {
      qualityWarnings.push("Resolución baja: solicita una foto más nítida y cercana de la cédula");
    }
    if (width && height && Math.min(width, height) < 400) {
      qualityWarnings.push("La imagen es demasiado pequeña para validar los datos del documento");
    }
    const enhanced = await source
      .resize({ width: 2200, withoutEnlargement: false })
      .grayscale()
      .normalise()
      .sharpen({ sigma: 1.1, m1: 0.8, m2: 1.6 })
      .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
      .toBuffer();
    return { original, enhanced, qualityWarnings };
  } catch {
    qualityWarnings.push("No se pudo preparar la imagen; OCR usó el archivo original");
    return { original, enhanced: original, qualityWarnings };
  }
}

/** Señal por cara del documento: no decide identidad, solo alerta si parece una foto ajena. */
function assessChileanIdSide(label: string, text: string, confidence: number): LocalDocumentAssessment {
  const lower = text.toLowerCase();
  const fakeHits = FAKE_DOC_HINTS.filter((hint) => lower.includes(hint));
  const idHits = ID_HINTS.filter((hint) => lower.includes(hint));
  const validRut = Boolean(extractRutFromText(text));
  const birthDate = Boolean(extractBirthDateFromText(text));
  const enoughText = text.trim().length >= 35;
  const isFront = label === "cedula_front";
  const looksLikeChileanId = fakeHits.length === 0 && enoughText && idHits.length >= 2 && (isFront ? validRut || birthDate : validRut || birthDate || idHits.length >= 3);
  const reasons: string[] = [];

  if (fakeHits.length) reasons.push(`Se detectó texto propio de una captura ajena: ${fakeHits.slice(0, 2).join(", ")}`);
  if (!enoughText) reasons.push("No se pudo leer suficiente texto del documento");
  if (idHits.length < 2) reasons.push("No se detectaron elementos propios de una cédula chilena");
  if (isFront && !validRut && !birthDate) reasons.push("No se pudo validar RUT ni fecha de nacimiento en el frontal");
  if (looksLikeChileanId) reasons.push("OCR detectó estructura compatible con cédula chilena");

  return {
    label,
    looksLikeChileanId,
    confidence: Math.round(confidence),
    reasons,
  };
}

export async function recognizeImageBase64(base64: string): Promise<{ text: string; confidence: number; qualityWarnings: string[] }> {
  const worker = await getWorker();
  const prepared = await prepareImageForOcr(base64);
  const passes: Array<{ text: string; confidence: number }> = [];
  for (const image of [prepared.enhanced, prepared.original]) {
    for (const psm of ["6", "11"]) {
      await worker.setParameters({ tessedit_pageseg_mode: psm as never, preserve_interword_spaces: "1" });
      const result = await worker.recognize(image);
      passes.push({ text: result.data.text ?? "", confidence: result.data.confidence ?? 0 });
    }
  }
  const best = passes.sort((a, b) => (b.confidence + b.text.length / 40) - (a.confidence + a.text.length / 40))[0];
  return { ...(best ?? { text: "", confidence: 0 }), qualityWarnings: prepared.qualityWarnings };
}

export async function analyzeImagesWithLocalOcr(
  files: Array<{ label: string; mime: string; base64: string }>,
): Promise<LocalOcrExtract> {
  const chunks: string[] = [];
  const ocrConfidences: number[] = [];
  const qualityWarnings: string[] = [];
  const documentAssessments: LocalDocumentAssessment[] = [];
  let sidesRead = 0;
  for (const file of files.slice(0, 3)) {
    try {
      const result = await recognizeImageBase64(file.base64);
      chunks.push(`--- ${file.label} ---\n${result.text}`);
      ocrConfidences.push(result.confidence);
      qualityWarnings.push(...result.qualityWarnings.map((warning) => `${file.label}: ${warning}`));
      if (result.text.trim().length >= 20) sidesRead += 1;
      documentAssessments.push(assessChileanIdSide(file.label, result.text, result.confidence));
    } catch (error) {
      chunks.push(`--- ${file.label} ---\n[OCR error: ${error instanceof Error ? error.message : "fail"}]`);
      documentAssessments.push({
        label: file.label,
        looksLikeChileanId: false,
        confidence: 0,
        reasons: ["No se pudo leer el archivo para comprobar si es una cédula chilena"],
      });
    }
  }

  const text = chunks.join("\n");
  const score = scoreDocumentText(text);
  const extractedRut = extractRutFromText(text);
  const extractedBirthDate = extractBirthDateFromText(text);
  const extractedExpiryDate = extractExpiryDateFromText(text);
  const ocrConfidence = ocrConfidences.length ? ocrConfidences.reduce((sum, value) => sum + value, 0) / ocrConfidences.length : 0;
  const lowerText = text.toLowerCase();
  const identityTextHits = ID_HINTS.filter((hint) => lowerText.includes(hint)).length;
  // Una cédula debe aportar más que una foto con algo de texto: RUT válido, fecha de
  // nacimiento, fecha de vencimiento y vocabulario propio del documento.
  const identityStructureConfirmed = Boolean(
    extractedRut &&
      extractedBirthDate &&
      extractedExpiryDate &&
      identityTextHits >= 2 &&
      sidesRead >= 1,
  );

  if (!extractedRut) score.reasons.push("No se pudo leer un RUT válido");
  if (!extractedBirthDate) score.reasons.push("No se pudo leer fecha de nacimiento");
  if (!extractedExpiryDate) score.reasons.push("No se pudo leer fecha de vencimiento");
  if (!identityStructureConfirmed && score.forgeryRisk !== "high") {
    score.documentLooksLikeChileanId = false;
    score.forgeryRisk = "medium";
    score.reasons.push("No se pudo comprobar la estructura mínima de una cédula chilena; requiere revisión humana");
  }
  if (qualityWarnings.length && score.forgeryRisk !== "high") {
    score.forgeryRisk = "medium";
    score.reasons.push(...qualityWarnings);
  }

  let confidence = score.confidence;
  if (extractedRut) confidence += 0.08;
  if (extractedBirthDate) confidence += 0.08;
  if (sidesRead >= 2) confidence += 0.04;
  if (ocrConfidence < 35) confidence -= 0.15;
  confidence = Math.min(0.95, confidence);

  return {
    text,
    extractedRut,
    extractedBirthDate,
    extractedExpiryDate,
    documentLooksLikeChileanId: score.documentLooksLikeChileanId,
    forgeryRisk: score.forgeryRisk,
    confidence,
    reasons: score.reasons,
    ocrConfidence,
    sidesRead,
    identityStructureConfirmed,
    qualityWarnings,
    documentAssessments,
  };
}
