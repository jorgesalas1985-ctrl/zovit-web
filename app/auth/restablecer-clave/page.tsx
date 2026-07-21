"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?error=auth-callback");
        return;
      }
      setCheckingSession(false);
    });
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
    setBusy(false);
  }

  if (checkingSession) {
    return <div className="centerState">Validando enlace…</div>;
  }

  if (success) {
    return (
      <main className="authPage">
        <section className="authCard successCard">
          <div className="successIcon"><CheckCircle2 size={28} /></div>
          <h1>Contraseña actualizada</h1>
          <p>Tu nueva contraseña quedó guardada. Ya puedes ingresar a ZOVIT.</p>
          <Link className="primaryButton wide" href="/login">
            Ir a ingresar <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authLogo">Z</div>
        <p className="kicker">RECUPERACIÓN</p>
        <h1>Nueva contraseña</h1>
        <p className="muted">Elige una contraseña segura para tu cuenta ZOVIT.</p>

        <form onSubmit={submit} className="formStack">
          <label>
            Nueva contraseña
            <div className="inputWithIcon">
              <LockKeyhole size={18} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          <label>
            Confirmar contraseña
            <div className="inputWithIcon">
              <LockKeyhole size={18} />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </label>

          {message && (
            <div className="formMessage">
              <AlertCircle size={17} /> {message}
            </div>
          )}

          <button className="primaryButton wide" disabled={busy}>
            {busy ? "Guardando…" : <>Guardar contraseña <ArrowRight size={18} /></>}
          </button>
        </form>
      </section>
    </main>
  );
}
