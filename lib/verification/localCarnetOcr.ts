import { createWorker, type Worker } from "tesseract.js";
import {
  isValidChileanRut,
  normalizeChileanRut,
} from "@/lib/registration/validateRegistration";
import { chileanDateToIso } from "@/lib/ui/chileanDate";

export type LocalOcrExtract = {
  text: string;
  extractedRut: string | null;
  extractedBirthDate: string | null;
  documentLooksLikeChileanId: boolean;
  forgeryRisk: "low" | "medium" | "high";
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
  const candidates =
    text.match(/\b\d{1,2}\.?\d{3}\.?\d{3}\s*-?\s*[\dkK]\b/g) ??
    text.match(/\b\d{7,8}\s*-?\s*[\dkK]\b/g) ??
    [];

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
  ];

  const nearBirth = /nacim|fecha|birth|f\.?\s*nac/i.test(text);
  const found: string[] = [];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(text)) !== null) {
      const raw = match[0];
      const iso = chileanDateToIso(raw) ?? tryIsoParts(match);
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

export async function recognizeImageBase64(base64: string): Promise<string> {
  const worker = await getWorker();
  const buffer = Buffer.from(base64, "base64");
  const result = await worker.recognize(buffer);
  return result.data.text ?? "";
}

export async function analyzeImagesWithLocalOcr(
  files: Array<{ label: string; mime: string; base64: string }>,
): Promise<LocalOcrExtract> {
  const chunks: string[] = [];
  for (const file of files.slice(0, 3)) {
    try {
      const text = await recognizeImageBase64(file.base64);
      chunks.push(`--- ${file.label} ---\n${text}`);
    } catch (error) {
      chunks.push(`--- ${file.label} ---\n[OCR error: ${error instanceof Error ? error.message : "fail"}]`);
    }
  }

  const text = chunks.join("\n");
  const score = scoreDocumentText(text);
  const extractedRut = extractRutFromText(text);
  const extractedBirthDate = extractBirthDateFromText(text);

  if (!extractedRut) score.reasons.push("No se pudo leer un RUT válido");
  if (!extractedBirthDate) score.reasons.push("No se pudo leer fecha de nacimiento");

  let confidence = score.confidence;
  if (extractedRut) confidence += 0.08;
  if (extractedBirthDate) confidence += 0.08;
  confidence = Math.min(0.95, confidence);

  return {
    text,
    extractedRut,
    extractedBirthDate,
    documentLooksLikeChileanId: score.documentLooksLikeChileanId,
    forgeryRisk: score.forgeryRisk,
    confidence,
    reasons: score.reasons,
  };
}
