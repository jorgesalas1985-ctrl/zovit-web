"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, BriefcaseBusiness, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { getAuthCallbackUrl } from "@/lib/auth/redirects";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [role, setRole] = useState<"client" | "professional">("client");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: getAuthCallbackUrl("/panel"),
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          role
        }
      }
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    setSuccess(true);
    setBusy(false);
  }

  if (success) {
    return (
      <main className="authPage">
        <section className="authCard successCard">
          <div className="successIcon">✓</div>
          <h1>Cuenta creada</h1>
          <p>Revisa tu correo y confirma tu cuenta para ingresar a ZOVIT.</p>
          <Link className="primaryButton wide" href="/login">Ir a ingresar <ArrowRight size={18} /></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="authPage">
      <section className="authCard large">
        <p className="kicker">REGISTRO REAL</p>
        <h1>Crea tu cuenta ZOVIT</h1>
        <p className="muted">Selecciona cómo utilizarás la plataforma.</p>

        <div className="roleSelector">
          <button className={role === "client" ? "roleCard active" : "roleCard"} onClick={() => setRole("client")}>
            <UserRound /><span><b>Cliente</b><small>Necesito contratar servicios</small></span>
          </button>
          <button className={role === "professional" ? "roleCard active" : "roleCard"} onClick={() => setRole("professional")}>
            <BriefcaseBusiness /><span><b>Profesional</b><small>Quiero ofrecer mis servicios</small></span>
          </button>
        </div>

        <form onSubmit={submit} className="formGrid">
          <label>Nombres<input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></label>
          <label>Apellidos<input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></label>
          <label>Teléfono<input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Correo electrónico<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label className="full">Contraseña<input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>

          {message && <div className="formMessage full"><AlertCircle size={17} /> {message}</div>}

          <button className="primaryButton wide full" disabled={busy}>
            {busy ? "Creando cuenta…" : <>Crear cuenta <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="authFooter">¿Ya tienes cuenta? <Link href="/login">Ingresa aquí</Link></p>
      </section>
    </main>
  );
}
