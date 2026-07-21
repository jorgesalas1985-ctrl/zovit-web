"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos."
        : error.message);
      setBusy(false);
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  async function resetPassword() {
    if (!email) {
      setMessage("Escribe primero tu correo.");
      return;
    }
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(error ? error.message : "Te enviamos un correo para recuperar tu contraseña.");
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authLogo">Z</div>
        <p className="kicker">BIENVENIDO</p>
        <h1>Ingresa a ZOVIT</h1>
        <p className="muted">Accede a tu perfil y revisa tus solicitudes.</p>

        <form onSubmit={submit} className="formStack">
          <label>
            Correo electrónico
            <div className="inputWithIcon"><Mail size={18} /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          </label>
          <label>
            Contraseña
            <div className="inputWithIcon"><LockKeyhole size={18} /><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
          </label>

          {message && <div className="formMessage"><AlertCircle size={17} /> {message}</div>}

          <button className="primaryButton wide" disabled={busy}>
            {busy ? "Ingresando…" : <>Ingresar <ArrowRight size={18} /></>}
          </button>
          <button type="button" className="linkButton" onClick={resetPassword}>Olvidé mi contraseña</button>
        </form>

        <p className="authFooter">¿Aún no tienes cuenta? <Link href="/registro">Regístrate</Link></p>
      </section>
    </main>
  );
}
