"use client";

import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/components/AuthProvider";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import {
  clearManualSelection,
  loadManualSelection,
  type ManualServiceSelection,
} from "@/lib/services/manualSelection";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AiRecommendationPayload = {
  description?: string;
  category?: string;
  specialty?: string;
};

export default function NewRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ category: "Hogar", description: "", address: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiSpecialty, setAiSpecialty] = useState("");
  const [manualSelection, setManualSelection] = useState<ManualServiceSelection | null>(null);

  useEffect(() => {
    const manual = loadManualSelection();
    if (manual) {
      setManualSelection(manual);
      setForm((prev) => ({
        ...prev,
        category:
          manual.category &&
          SERVICE_CATEGORIES.includes(manual.category as typeof SERVICE_CATEGORIES[number])
            ? manual.category
            : prev.category,
        description: manual.description,
        address: manual.commune ?? prev.address,
      }));
      clearManualSelection();
      return;
    }

    const raw = sessionStorage.getItem("zovit_ai_recommendation");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as AiRecommendationPayload;
      setForm((prev) => ({
        ...prev,
        description: payload.description ?? prev.description,
        category:
          payload.category &&
          SERVICE_CATEGORIES.includes(payload.category as typeof SERVICE_CATEGORIES[number])
            ? payload.category
            : prev.category,
      }));
      setAiSpecialty(payload.specialty ?? "");
    } catch {
      // Ignorar payload inválido.
    } finally {
      sessionStorage.removeItem("zovit_ai_recommendation");
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      setMessage("Debes iniciar sesión para publicar la solicitud.");
      return;
    }
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase
      .from("solicitudes_de_servicio")
      .insert({
        client_id: user.id,
        category: form.category,
        description: form.description,
        address: form.address,
        status: "publicada",
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    if (data?.id) {
      router.push(`/solicitudes/${data.id}`);
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  return (
    <Protected>
      <RoleGuard requiredMode="client">
        <main className="simplePage">
          <section className="formPageCard">
            <div className="eyebrow"><Sparkles size={16} /> Solicitud real</div>
            <h1>¿Qué necesitas resolver?</h1>
            <p className="muted">La solicitud quedará vinculada a tu cuenta y almacenada en Supabase.</p>

            {manualSelection && (
              <div className="manualPrefillNote">
                <p>
                  Selección manual: <strong>{manualSelection.subcategory}</strong> en{" "}
                  <strong>{manualSelection.category}</strong>
                </p>
                {manualSelection.referencePrice && <p>{manualSelection.referencePrice}</p>}
                <Link
                  href={`/servicios/${manualSelection.categorySlug}/${manualSelection.subcategorySlug}`}
                  className="textLink"
                >
                  Volver a la subcategoría
                </Link>
              </div>
            )}

            {aiSpecialty && (
              <p className="aiPrefillNote">
                Especialidad sugerida por IA: <strong>{aiSpecialty}</strong>
              </p>
            )}

            <form onSubmit={submit} className="formStack">
              <label>
                Categoría
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Describe el servicio
                <textarea
                  required
                  minLength={10}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalle opcional adicional sobre lo que necesitas…"
                />
              </label>
              <label>
                Dirección o comuna
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ejemplo: San Bernardo"
                />
              </label>

              {message && (
                <div className="formMessage">
                  <AlertCircle size={17} /> {message}
                </div>
              )}

              <button className="primaryButton wide" disabled={busy}>
                {busy ? "Publicando…" : <>Publicar solicitud <ArrowRight size={18} /></>}
              </button>
            </form>
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
