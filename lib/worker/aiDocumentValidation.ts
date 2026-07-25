export type AiForgeryRisk = "low" | "medium" | "high";
export type AiReviewDecision = "approved" | "rejected" | "dudoso";

export type AiDocumentInput = {
  profile: {
    firstName: string;
    lastName: string;
    rut: string | null;
  };
  credentials: Array<{
    id: string;
    profession: string | null;
    institution: string | null;
    credentialName: string | null;
    yearObtained: number | null;
    registryNumber: string | null;
    expiresAt: string | null;
    storagePath: string | null;
    documentMime: string | null;
  }>;
  draftSummary: {
    suggestedProfiles: string[];
    experienceTrade?: string;
    trainingInstitution?: string;
    trainingCareer?: string;
    enrollmentStoragePath?: string | null;
    enrollmentDocName?: string | null;
  };
  /** Archivos ya descargados (base64) listos para Vision */
  files: Array<{
    label: string;
    mime: string;
    base64: string;
  }>;
};

export type AiCredentialVerdict = {
  credentialId: string | null;
  decision: AiReviewDecision;
  forgeryRisk: AiForgeryRisk;
  confidence: number;
  reasons: string[];
  manipulationSignals: string[];
};

export type AiWorkerVerdict = {
  decision: AiReviewDecision;
  confidence: number;
  forgeryRisk: AiForgeryRisk;
  summary: string;
  professionalMessage: string;
  credentials: AiCredentialVerdict[];
  model: string;
};

const APPROVE_MIN = 0.82;
const REJECT_FORGERY: AiForgeryRisk[] = ["high"];

export function decideFromScores(input: {
  confidence: number;
  forgeryRisk: AiForgeryRisk;
  hasDocuments: boolean;
  explicitReject?: boolean;
}): AiReviewDecision {
  if (!input.hasDocuments) return "dudoso";
  if (input.explicitReject || REJECT_FORGERY.includes(input.forgeryRisk)) return "rejected";
  if (input.forgeryRisk === "medium") return "dudoso";
  if (input.confidence >= APPROVE_MIN && input.forgeryRisk === "low") return "approved";
  if (input.confidence < 0.45) return "rejected";
  return "dudoso";
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("La IA no devolvió JSON válido.");
  return JSON.parse(raw.slice(start, end + 1));
}

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function asRisk(value: unknown): AiForgeryRisk {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

export function normalizeAiWorkerVerdict(
  parsed: unknown,
  model: string,
  hasDocuments: boolean
): AiWorkerVerdict {
  const data = (parsed ?? {}) as Record<string, unknown>;
  const confidence = clampConfidence(data.confidence);
  const forgeryRisk = asRisk(data.forgeryRisk ?? data.forgery_risk);
  const explicitReject =
    data.decision === "rejected" ||
    data.shouldReject === true ||
    String(data.decision ?? "").toLowerCase() === "reject";

  const decision =
    data.decision === "approved" || data.decision === "rejected" || data.decision === "dudoso"
      ? (data.decision as AiReviewDecision)
      : decideFromScores({ confidence, forgeryRisk, hasDocuments, explicitReject });

  const finalDecision = decideFromScores({
    confidence,
    forgeryRisk,
    hasDocuments,
    explicitReject: decision === "rejected" || explicitReject,
  });

  // Si el modelo pide approve pero hay riesgo medio/alto, no auto-aprobar.
  const safeDecision =
    decision === "approved" && forgeryRisk !== "low"
      ? "dudoso"
      : finalDecision === "approved" && forgeryRisk !== "low"
        ? "dudoso"
        : decision === "approved" && confidence < APPROVE_MIN
          ? "dudoso"
          : decision === "rejected"
            ? "rejected"
            : finalDecision;

  const credentialsRaw = Array.isArray(data.credentials) ? data.credentials : [];
  const credentials: AiCredentialVerdict[] = credentialsRaw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const cConf = clampConfidence(row.confidence);
    const cRisk = asRisk(row.forgeryRisk ?? row.forgery_risk);
    const cDecision =
      row.decision === "approved" || row.decision === "rejected" || row.decision === "dudoso"
        ? (row.decision as AiReviewDecision)
        : decideFromScores({
            confidence: cConf,
            forgeryRisk: cRisk,
            hasDocuments,
          });
    return {
      credentialId: typeof row.credentialId === "string" ? row.credentialId : null,
      decision: cDecision,
      forgeryRisk: cRisk,
      confidence: cConf,
      reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : [],
      manipulationSignals: Array.isArray(row.manipulationSignals)
        ? row.manipulationSignals.map(String)
        : Array.isArray(row.manipulation_signals)
          ? row.manipulation_signals.map(String)
          : [],
    };
  });

  return {
    decision: safeDecision,
    confidence,
    forgeryRisk,
    summary: String(data.summary ?? data.reason ?? "Sin resumen de la IA."),
    professionalMessage: String(
      data.professionalMessage ??
        data.professional_message ??
        (safeDecision === "approved"
          ? "Tu documentación fue validada automáticamente."
          : safeDecision === "rejected"
            ? "Tu documentación no pudo validarse. Sube un documento original legible."
            : "Necesitamos una revisión adicional de tu documentación.")
    ),
    credentials,
    model,
  };
}

function buildPrompt(input: AiDocumentInput): string {
  return [
    "Eres un revisor documental de ZOVIT (Chile). Evalúas certificados, licencias, títulos y matrículas.",
    "Debes detectar indicios de manipulación digital (photoshop, montaje, texto flotante, sellos inconsistentes,",
    "compresión mixta, recortes, plantillas genéricas, capturas de WhatsApp, marcas de agua de ejemplo, metadatos raros).",
    "No puedes certificar autenticidad legal ante el Estado, pero SÍ debes rechazar documentos claramente alterados o falsos.",
    "",
    "Perfil declarado:",
    `- Nombre: ${input.profile.firstName} ${input.profile.lastName}`,
    `- RUT: ${input.profile.rut ?? "no informado"}`,
    `- Perfiles sugeridos: ${input.draftSummary.suggestedProfiles.join(", ") || "ninguno"}`,
    `- Oficio experiencia: ${input.draftSummary.experienceTrade ?? "—"}`,
    `- Formación: ${input.draftSummary.trainingInstitution ?? "—"} / ${input.draftSummary.trainingCareer ?? "—"}`,
    "",
    "Credenciales declaradas (JSON):",
    JSON.stringify(input.credentials, null, 2),
    "",
    "Responde SOLO JSON con esta forma:",
    JSON.stringify(
      {
        decision: "approved|rejected|dudoso",
        confidence: 0.0,
        forgeryRisk: "low|medium|high",
        summary: "resumen interno para admin",
        professionalMessage: "mensaje corto al profesional",
        credentials: [
          {
            credentialId: "uuid o null",
            decision: "approved|rejected|dudoso",
            confidence: 0.0,
            forgeryRisk: "low|medium|high",
            reasons: ["..."],
            manipulationSignals: ["..."],
          },
        ],
      },
      null,
      2
    ),
    "",
    "Reglas:",
    "- forgeryRisk=high si hay indicios claros de fotomontaje/falsedad → decision rejected.",
    "- forgeryRisk=medium o confianza media → dudoso.",
    "- Solo approved si el documento es legible, coherente con nombre/RUT/datos y forgeryRisk=low.",
    "- Si no hay imagen/PDF usable, decision dudoso.",
  ].join("\n");
}

export async function analyzeWorkerDocumentsWithOpenAI(
  input: AiDocumentInput,
  options?: { apiKey?: string; model?: string }
): Promise<AiWorkerVerdict> {
  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o";
  const hasDocuments = input.files.length > 0;

  if (!apiKey) {
    return {
      decision: "dudoso",
      confidence: 0,
      forgeryRisk: "medium",
      summary: "Falta OPENAI_API_KEY en el servidor. No se pudo validar automáticamente.",
      professionalMessage: "Tu solicitud quedó en revisión. Te avisaremos pronto.",
      credentials: [],
      model: "none",
    };
  }

  if (!hasDocuments) {
    return {
      decision: "dudoso",
      confidence: 0.2,
      forgeryRisk: "medium",
      summary: "Sin archivos en storage. Solo hay metadatos declarados; requiere documento adjunto.",
      professionalMessage:
        "Sube el certificado, licencia o matrícula en formato imagen o PDF para continuar la validación.",
      credentials: input.credentials.map((c) => ({
        credentialId: c.id,
        decision: "dudoso" as const,
        forgeryRisk: "medium" as const,
        confidence: 0.2,
        reasons: ["Sin archivo adjunto"],
        manipulationSignals: [],
      })),
      model: "rules-no-file",
    };
  }

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: buildPrompt(input) },
  ];

  for (const file of input.files) {
    if (file.mime === "application/pdf") {
      content.push({
        type: "text",
        text: `Archivo PDF "${file.label}" adjunto en base64 (primeros caracteres omitidos en visión). Analiza coherencia si el modelo lo permite; si no puedes leer PDF, marca dudoso.`,
      });
      // Vision models prefer images; for PDF send as text note + skip binary to avoid huge payloads
      // when possible. If small PDF, still attach as image_url data url may fail — keep metadata path.
      continue;
    }
    content.push({
      type: "text",
      text: `Documento: ${file.label}`,
    });
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${file.mime};base64,${file.base64}`,
        detail: "high",
      },
    });
  }

  // If all were PDFs, still call with text-only analysis of metadata + ask reject/dudoso
  if (content.length === 1) {
    content.push({
      type: "text",
      text: "Solo hay PDFs. Sin preview visual: decision=dudoso salvo que los metadatos sean inconsistentes (entonces rejected).",
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres un auditor documental estricto. Respondes únicamente JSON válido según el esquema pedido.",
        },
        { role: "user", content },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errText.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(text);
  return normalizeAiWorkerVerdict(parsed, model, hasDocuments);
}
