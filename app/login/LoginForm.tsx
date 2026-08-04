"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, BriefcaseBusiness, Building2, ChevronDown, GraduationCap, Landmark, LockKeyhole, Mail, UserRound } from "lucide-react";
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

type LoginAccountKind = "client" | "professional" | "student" | "company" | "institution";

const LOGIN_ACCOUNT_OPTIONS: Array<{
  id: LoginAccountKind;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "client", label: "Cliente", icon: UserRound },
  { id: "professional", label: "Profesional", icon: BriefcaseBusiness },
  { id: "student", label: "Alumno", icon: GraduationCap },
  { id: "company", label: "Empresa", icon: Building2 },
  { id: "institution", label: "Institucion", icon: Landmark },
];

function roleForLoginAccount(kind: LoginAccountKind): "client" | "professional" {
  return kind === "professional" || kind === "student" ? "professional" : "client";
}

function loginAccountLabel(kind: LoginAccountKind): string {
  return LOGIN_ACCOUNT_OPTIONS.find((option) => option.id === kind)?.label ?? "Cliente";
}

function authErrorMessage(message: string): string {
  if (message === "Invalid login credentials") return "Correo o contraseña incorrectos.";
  if (/email not confirmed|not confirmed/i.test(message)) {
    return "Tu cuenta fue creada, pero falta confirmar el correo. Abre el correo de ZOVIT/Supabase, confirma la cuenta y vuelve a ingresar.";
  }
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, profileError, profileLoading, loading, refreshProfile } = useAuth();
  const [accountType, setAccountType] = useState<LoginAccountKind>("client");
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
      setMessage(authErrorMessage(error.message));
      setBusy(false);
      return;
    }

    if (data.user) {
      const profileResult = await supabase
        .from("profiles")
        .select("role, intranet_role, account_kind")
        .eq("id", data.user.id)
        .maybeSingle();
      let profileRow = profileResult.data as { role?: string | null; intranet_role?: string | null; account_kind?: string | null } | null;
      let profileError = profileResult.error;

      if (profileError && profileError.message.includes("account_kind")) {
        const legacyResult = await supabase
          .from("profiles")
          .select("role, intranet_role")
          .eq("id", data.user.id)
          .maybeSingle();
        profileRow = legacyResult.data as { role?: string | null; intranet_role?: string | null; account_kind?: string | null } | null;
        profileError = legacyResult.error;
      }

      if (profileError || !profileRow?.role) {
        setMessage(roleErrorMessage("perfil-incompleto"));
        await supabase.auth.signOut();
        setBusy(false);
        return;
      }

      const isSuperAdmin = profileRow.intranet_role === "super_admin";

      const profileAccountKind = (profileRow.account_kind as LoginAccountKind | null) ?? null;
      const selectedRole = roleForLoginAccount(accountType);
      const profileLoginKind = profileAccountKind ?? profileRow.role;

      if (!isSuperAdmin && profileRow.role !== "admin" && profileLoginKind !== accountType && profileRow.role !== selectedRole) {
        setMessage(
          `Esta cuenta no corresponde a ${loginAccountLabel(accountType)}. Cambia el tipo de cuenta arriba.`
        );
        await supabase.auth.signOut();
        setBusy(false);
        return;
      }

      // Super admin no pasa por verificación/revisión pendiente de registro.
      if (!isSuperAdmin) {
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
                <span>{loginAccountLabel(accountType)}</span>
                <ChevronDown size={22} className={accountMenuOpen ? "authSelectChevron open" : "authSelectChevron"} />
              </button>

              {accountMenuOpen && (
                <ul className="authSelectMenu" role="listbox" aria-label="Tipo de cuenta">
                  {LOGIN_ACCOUNT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={accountType === option.id}
                          className={accountType === option.id ? "active" : undefined}
                          onClick={() => {
                            setAccountType(option.id);
                            setAccountMenuOpen(false);
                          }}
                        >
                          <Icon size={16} /> {option.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </label>
          <label>
            Correo electrónico
            <div className="inputWithIcon">
              <Mail size={18} />
              <input
                type="email"
                required
                placeholder="nombre@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>
          <label>
            Contraseña
            <div className="inputWithIcon">
              <LockKeyhole size={18} />
              <input
                type="password"
                required
                placeholder="Tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <small className="fieldHint">{PASSWORD_HINT}</small>
          </label>

          {message && <div className="formMessage"><AlertCircle size={17} /> {message}</div>}

          <p className="authLegalNote">
            Al ingresar aceptas los{" "}
            <Link href="/legal/terminos">Términos y condiciones</Link> (incluye coordinar y pagar
            solo en ZOVIT; eludir el pago puede bloquear cuentas) y la{" "}
            <Link href="/legal/privacidad">Política de privacidad</Link>.
          </p>

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
