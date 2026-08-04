export type DeepSeekEnrichment = {
  explanation: string;
  confidence: number;
  matchedSignals: string[];
};

export async function enrichServiceNeedWithAi(
  query: string,
  parsed: {
    category: string;
    specialty: string;
    confidence: number;
    explanation: string;
    matchedSignals: string[];
  },
): Promise<DeepSeekEnrichment> {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.DEEP_API_KEY ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      explanation: parsed.explanation,
      confidence: parsed.confidence,
      matchedSignals: parsed.matchedSignals,
    };
  }

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente que ayuda a clasificar solicitudes de servicios para ZOVIT. Responde solo con una explicación breve, en español, sin markdown.",
        },
        {
          role: "user",
          content: `Consulta: ${query}\nCategoría detectada: ${parsed.category}\nEspecialidad: ${parsed.specialty}\nConfianza: ${parsed.confidence}\nSeñales: ${parsed.matchedSignals.join(", ") || "ninguna"}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return {
      explanation: parsed.explanation,
      confidence: parsed.confidence,
      matchedSignals: parsed.matchedSignals,
    };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return {
      explanation: parsed.explanation,
      confidence: parsed.confidence,
      matchedSignals: parsed.matchedSignals,
    };
  }

  return {
    explanation: content,
    confidence: Math.min(0.98, parsed.confidence + 0.05),
    matchedSignals: parsed.matchedSignals,
  };
}
