"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { resolvePostLoginPath, roleErrorMessage } from "@/lib/auth/roles";
import { getAuthCallbackUrl } from "@/lib/auth/redirects";
import { completeRegistrationVerification } from "@/lib/registration/finishRegistration";
import { flushPendingRegistration } from "@/lib/registration/pendingRegistration";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, profileError, profileLoading, loading, refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode && !user) {
      setMessage(roleErrorMessage(errorCode));
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (loading || profileLoading || busy) return;

    if (profileError === "perfil-incompleto") {
      setMessage(roleErrorMessage("perfil-incompleto"));
      return;
    }

    if (!user || !profile?.role) return;

    setMessage("");
    const destination = resolvePostLoginPath(
      searchParams.get("next"),
      profile.role,
      profile.identity_status
    );
    router.replace(destination);
  }, [busy, loading, profile, profileError, profileLoading, router, searchParams, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos."
        : error.message);
      setBusy(false);
      return;
    }

    if (data.user) {
      try {
        await flushPendingRegistration(email, data.user.id, completeRegistrationVerification);
      } catch (pendingError) {
        setMessage(
          pendingError instanceof Error
            ? pendingError.message
            : "No se pudo completar tu verificación biométrica pendiente."
        );
        setBusy(false);
        return;
      }
    }

    await refreshProfile();
    setBusy(false);
  }

  async function resetPassword() {
    if (!email) {
      setMessage("Escribe primero tu correo.");
      return;
    }

    const redirectTo = getAuthCallbackUrl("/auth/restablecer-clave");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setMessage(error ? error.message : "Te enviamos un correo para recuperar tu contraseña.");
  }

  if (loading || profileLoading || (user && profile?.role)) {
    return <div className="centerState">Redirigiendo…</div>;
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
            <div className="inputWithIcon"><Mail size={18} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          </label>
          <label>
            Contraseña
            <div className="inputWithIcon"><LockKeyhole size={18} /><input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
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

export default LoginForm;
