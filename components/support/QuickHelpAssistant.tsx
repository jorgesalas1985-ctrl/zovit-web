"use client";

import { MessageCircle, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

type HelpResult = {
  answer: string;
  links: Array<{ href: string; label: string }>;
};

export function QuickHelpAssistant() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HelpResult | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/support/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "No se pudo responder.");
      return;
    }
    setResult({ answer: data.answer, links: data.links ?? [] });
  }

  return (
    <section className="quickHelpCard">
      <div className="quickHelpHead">
        <Sparkles size={18} />
        <div>
          <strong>Respuesta rápida</strong>
          <p className="muted">Pregunta y ZOVIT te orienta al instante (sin esperar a una persona).</p>
        </div>
      </div>

      <form className="quickHelpForm" onSubmit={(e) => void onSubmit(e)}>
        <label>
          ¿Qué necesitas?
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej: ¿Cómo verifico mi carnet? ¿Cuándo me pagan?"
            maxLength={500}
          />
        </label>
        <button type="submit" className="primaryButton" disabled={busy || !question.trim()}>
          {busy ? "Pensando…" : (
            <>
              Preguntar <Send size={16} />
            </>
          )}
        </button>
      </form>

      {error && <p className="aiError">{error}</p>}

      {result && (
        <div className="quickHelpAnswer">
          <p>
            <MessageCircle size={16} /> {result.answer}
          </p>
          {result.links.length > 0 && (
            <div className="quickHelpLinks">
              {result.links.map((link) => (
                <Link key={link.href} href={link.href} className="secondaryButton">
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
