"use client";

import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const categories = ["Hogar", "Automotriz", "Construcción", "Tecnología", "Jardinería", "Limpieza", "Transporte de carga", "Salud", "Educación", "Profesionales"];

export default function NewRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ category: "Hogar", description: "", address: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("zovit_pending_request");
    if (pending) {
      setForm(prev => ({ ...prev, description: pending }));
      sessionStorage.removeItem("zovit_pending_request");
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage("");

    const { error } = await supabase.from("solicitudes_de_servicio").insert({
      client_id: user.id,
      category: form.category,
      description: form.description,
      address: form.address,
      status: "publicada"
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  return (
    <Protected>
      <RoleGuard allowedRoles={["client", "admin"]}>
      <main className="simplePage">
        <section className="formPageCard">
          <div className="eyebrow"><Sparkles size={16} /> Solicitud real</div>
          <h1>¿Qué necesitas resolver?</h1>
          <p className="muted">La solicitud quedará vinculada a tu cuenta y almacenada en Supabase.</p>

          <form onSubmit={submit} className="formStack">
            <label>Categoría<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Describe el problema<textarea required minLength={10} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe el problema con el mayor detalle posible…" /></label>
            <label>Dirección o comuna<input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Ejemplo: San Bernardo" /></label>

            {message && <div className="formMessage"><AlertCircle size={17} /> {message}</div>}

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
