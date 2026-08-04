import test from "node:test";
import assert from "node:assert/strict";
import { chatWithVision, resolveAiProvider } from "./provider";

test("resolveAiProvider prefers local Ollama when configured", () => {
  process.env.OLLAMA_BASE_URL = "http://localhost:11434";
  process.env.OLLAMA_MODEL = "llama3.2:latest";

  try {
    const provider = resolveAiProvider();
    assert.equal(provider.configured, true);
    assert.equal(provider.provider, "ollama");
    assert.equal(provider.model, "llama3.2:latest");
  } finally {
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
  }
});

test("chatWithVision uses Ollama when configured", async () => {
  process.env.OLLAMA_BASE_URL = "http://localhost:11434";
  process.env.OLLAMA_MODEL = "llama3.2:latest";

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        message: { content: "respuesta desde ollama" },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )) as unknown as typeof fetch;

  try {
    const result = await chatWithVision({
      system: "Eres un ayudante",
      parts: [{ type: "text", text: "Hola" }],
    });

    assert.equal(result.provider, "ollama");
    assert.equal(result.model, "llama3.2:latest");
    assert.equal(result.text, "respuesta desde ollama");
  } finally {
    global.fetch = originalFetch;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
  }
});
