"use client";

import { Star } from "lucide-react";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type ServiceRatingFormProps = {
  requestId: string;
  onSubmitted: () => void;
};

export function ServiceRatingForm({ requestId, onSubmitted }: ServiceRatingFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error: submitError } = await supabase.rpc("submit_service_rating", {
      p_request_id: requestId,
      p_rating: rating,
      p_comment: comment.trim() || null,
    });

    if (submitError) {
      setError(submitError.message);
      setBusy(false);
      return;
    }

    onSubmitted();
    setBusy(false);
  }

  return (
    <form className="ratingForm" onSubmit={submit}>
      <p className="kicker">CALIFICACIÓN</p>
      <h3>¿Cómo fue el servicio?</h3>
      <p className="muted">Tu calificación queda registrada y ayuda a construir experiencia verificable.</p>

      <div className="ratingStars" role="radiogroup" aria-label="Calificación del servicio">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={value <= rating ? "ratingStar active" : "ratingStar"}
            aria-label={`${value} estrellas`}
            onClick={() => setRating(value)}
          >
            <Star size={22} fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>

      <label>
        Comentario (opcional)
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Cuéntanos brevemente tu experiencia…"
          maxLength={500}
        />
      </label>

      {error && <div className="formMessage">{error}</div>}

      <button className="primaryButton" disabled={busy}>
        {busy ? "Enviando…" : "Enviar calificación"}
      </button>
    </form>
  );
}
