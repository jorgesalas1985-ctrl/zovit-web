"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { canAccessRoute, isUserRole, roleErrorMessage } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setMessage(roleErrorMessage(errorCode));
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading || !user || !profile?.role) return;

    const nextPath = searchParams.get("next") || "/panel";
    const destination = canAccessRoute(nextPath, profile.role) ? nextPath : "/panel";
    router.replace(destination);
  }, [loading, profile, router, searchParams, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
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

    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();

    if (!signedInUser) {
      setMessage("No fue posible validar la sesión. Intenta nuevamente.");
      setBusy(false);
      return;
    }

    const { data: signedInProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signedInUser.id)
      .maybeSingle();

    if (profileError || !isUserRole(signedInProfile?.role)) {
      await supabase.auth.signOut();
      setMessage(roleErrorMessage("perfil-incompleto"));
      setBusy(false);
      return;
    }

    const nextPath = searchParams.get("next") || "/panel";
    const destination = canAccessRoute(nextPath, signedInProfile.role) ? nextPath : "/panel";
    router.push(destination);
    router.refresh();
  }

  async function resetPassword() {
    if (!email) {
      setMessage("Escribe primero tu correo.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/restablecer-clave`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setMessage(error ? error.message : "Te enviamos un correo para recuperar tu contraseña.");
  }

  if (loading) {
    return <div className="centerState">Cargando ZOVIT…</div>;
  }

  if (user && profile?.role) {
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
