import type { ServiceCategory } from "@/lib/categories";
import { SERVICE_CATALOG } from "@/lib/ai/serviceCatalog";
import type { ParsedServiceNeed } from "@/lib/ai/types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ");
}

function countMatches(text: string, keywords: string[]): string[] {
  const hits: string[] = [];
  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    if (normalizedKeyword.includes(" ")) {
      if (text.includes(normalizedKeyword)) hits.push(keyword);
      continue;
    }
    const pattern = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) hits.push(keyword);
  }
  return hits;
}

type ScoreResult = {
  category: ServiceCategory;
  specialtyId: string;
  specialtyLabel: string;
  score: number;
  signals: string[];
};

export function parseServiceQuery(query: string): ParsedServiceNeed {
  const normalized = normalize(query);
  const results: ScoreResult[] = [];

  for (const categoryDef of SERVICE_CATALOG) {
    const categoryHits = countMatches(normalized, categoryDef.generalKeywords);

    for (const specialty of categoryDef.specialties) {
      const specialtyHits = countMatches(normalized, specialty.keywords);
      const score = categoryHits.length * 2 + specialtyHits.length * 5;

      if (score > 0) {
        results.push({
          category: categoryDef.category,
          specialtyId: specialty.id,
          specialtyLabel: specialty.label,
          score,
          signals: [...categoryHits, ...specialtyHits],
        });
      }
    }

    if (categoryHits.length > 0 && categoryDef.specialties.length > 0) {
      const topSpecialty = categoryDef.specialties[0];
      results.push({
        category: categoryDef.category,
        specialtyId: topSpecialty.id,
        specialtyLabel: topSpecialty.label,
        score: categoryHits.length * 2,
        signals: categoryHits,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  const best = results[0];

  if (!best) {
    return {
      category: "Profesionales",
      specialty: "Asesoría general",
      confidence: 0.35,
      explanation:
        "No detectamos una especialidad exacta, pero puedes publicar la solicitud y un profesional verificado te contactará.",
      matchedSignals: [],
    };
  }

  const maxScore = Math.max(...results.map((item) => item.score), 1);
  const confidence = Math.min(0.95, 0.45 + (best.score / maxScore) * 0.5);
  const signals = [...new Set(best.signals)].slice(0, 4);

  const explanation = buildExplanation(best.category, best.specialtyLabel, signals);

  return {
    category: best.category,
    specialty: best.specialtyLabel,
    confidence,
    explanation,
    matchedSignals: signals,
  };
}

function buildExplanation(
  category: ServiceCategory,
  specialty: string,
  signals: string[],
): string {
  const signalText =
    signals.length > 0
      ? `Detectamos señales como «${signals.slice(0, 3).join("», «")}». `
      : "";

  return `${signalText}Tu caso encaja con ${specialty.toLowerCase()} (${category}). Te recomendamos profesionales conectados en ZOVIT que pueden ayudarte.`;
}
