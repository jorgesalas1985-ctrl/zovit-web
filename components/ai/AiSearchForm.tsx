"use client";

import { Bot, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  initialQuery?: string;
  autoFocus?: boolean;
};

const EXAMPLES = [
  "Necesito un pintor para el living esta semana",
  "Se me rompió una cañería en el baño",
  "Quiero un electricista para instalar luces LED",
];

export function AiSearchForm({ initialQuery = "", autoFocus = false }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState("");

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 8) {
      setError("Describe tu necesidad con al menos 8 caracteres.");
      return;
    }
    setError("");
    router.push(`/ia/resultados?q=${encodeURIComponent(trimmed)}`);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(query);
  };

  return (
    <form className="aiSearchForm" onSubmit={onSubmit}>
      <label className="aiSearchLabel" htmlFor="ai-search-query">
        <Bot size={18} />
        Describe qué necesitas
      </label>
      <textarea
        id="ai-search-query"
        className="aiSearchInput"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (error) setError("");
        }}
        placeholder="Ej: Necesito un gasfiter para reparar una llave que gotea en Ñuñoa"
        rows={4}
        autoFocus={autoFocus}
        maxLength={500}
      />
      {error && <p className="aiSearchError">{error}</p>}
      <button type="submit" className="primaryButton wide aiSearchSubmit">
        <Sparkles size={18} /> Analizar con ZOVIT IA
      </button>
      <div className="aiSearchExamples">
        <p className="muted">Prueba con:</p>
        <div className="aiSearchExampleList">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="aiSearchExample"
              onClick={() => {
                setQuery(example);
                submit(example);
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
