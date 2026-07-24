"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, ChevronDown, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { resolvePostLoginPath, roleErrorMessage } from "@/lib/auth/roles";
import { getAuthCallbackUrl } from "@/lib/auth/redirects";
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
  PASSWORD_HINT,
} from "@/lib/auth/passwordPolicy";
import { completeRegistrationVerification } from "@/lib/registration/finishRegistration";
import { flushPendingRegistration } from "@/lib/registration/pendingRegistration";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, profileError, profileLoading, loading, refreshProfile } = useAuth();
  const [accountType, setAccountType] = useState<"client" | "professional">("client");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
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
    if (!accountMenuOpen) return;

    function closeMenu(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [accountMenuOpen]);

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
      profile,
      profile.identity_status
    );
    router.replace(destination);
  }, [busy, loading, profile, profileError, profileLoading, router, searchParams, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeAuthEmail(email),
      password: normalizeAuthPassword(password),
    });

    if (error) {
      setMessage(error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos."
        : error.message);
      setBusy(false);
      return;
    }

    if (data.user) {
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profileRow?.role) {
        setMessage(roleErrorMessage("perfil-incompleto"));
        await supabase.auth.signOut();
        setBusy(false);
        return;
      }

      if (
        profileRow.role !== "admin" &&
        profileRow.role !== accountType
      ) {
        setMessage(
          accountType === "client"
            ? "Esta cuenta es de profesional. Cambia el tipo de cuenta arriba."
            : "Esta cuenta es de cliente. Cambia el tipo de cuenta arriba."
        );
        await supabase.auth.signOut();
        setBusy(false);
        return;
      }

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
            Tipo de cuenta
            <div className="authSelectWrap" ref={accountMenuRef}>
              <button
                type="button"
                className="authSelectTrigger"
                aria-haspopup="listbox"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <UserRound size={18} />
                <span>{accountType === "client" ? "Cliente" : "Profesional"}</span>
                <ChevronDown size={22} className={accountMenuOpen ? "authSelectChevron open" : "authSelectChevron"} />
              </button>

              {accountMenuOpen && (
                <ul className="authSelectMenu" role="listbox" aria-label="Tipo de cuenta">
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={accountType === "client"}
                      className={accountType === "client" ? "active" : undefined}
                      onClick={() => {
                        setAccountType("client");
                        setAccountMenuOpen(false);
                      }}
                    >
                      Cliente
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={accountType === "professional"}
                      className={accountType === "professional" ? "active" : undefined}
                      onClick={() => {
                        setAccountType("professional");
                        setAccountMenuOpen(false);
                      }}
                    >
                      Profesional
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </label>
          <label>
            Correo electrónico
            <div className="inputWithIcon"><Mail size={18} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          </label>
          <label>
            Contraseña
            <div className="inputWithIcon"><LockKeyhole size={18} /><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <small className="fieldHint">{PASSWORD_HINT}</small>
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
