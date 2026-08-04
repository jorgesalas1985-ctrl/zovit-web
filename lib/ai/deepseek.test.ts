import test from "node:test";
import assert from "node:assert/strict";
import { enrichServiceNeedWithAi } from "./deepseek";

test("returns the original parsed result when no AI key is configured", async () => {
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEP_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const parsed = {
    category: "Hogar",
    specialty: "Pintura",
    confidence: 0.8,
    explanation: "Explicación base",
    matchedSignals: ["pintura"],
  };

  const result = await enrichServiceNeedWithAi("necesito pintar una casa", parsed);

  assert.equal(result.explanation, parsed.explanation);
});

test("uses the AI response when a key is configured", async () => {
  process.env.DEEPSEEK_API_KEY = "test-key";

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "Respuesta refinada" } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;

  try {
    const parsed = {
      category: "Hogar",
      specialty: "Pintura",
      confidence: 0.8,
      explanation: "Explicación base",
      matchedSignals: ["pintura"],
    };

    const result = await enrichServiceNeedWithAi("necesito pintar una casa", parsed);

    assert.equal(result.explanation, "Respuesta refinada");
  } finally {
    global.fetch = originalFetch;
    delete process.env.DEEPSEEK_API_KEY;
  }
});
