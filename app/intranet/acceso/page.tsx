"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  INTRANET_LOGIN_PROFILE_LABELS,
  intranetHomeForRole,
  isIntranetRole,
  type IntranetRole,
} from "@/lib/auth/intranetRoles";
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
  PASSWORD_HINT,
} from "@/lib/auth/passwordPolicy";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowRight, Building2, ChevronDown, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function IntranetAccessPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<IntranetRole>("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const intranetRole = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;

  useEffect(() => {
    if (intranetRole) {
      setSelectedProfile(intranetRole);
    }
  }, [intranetRole]);

  useEffect(() => {
    if (loading || busy || !user || !intranetRole) return;
    router.replace(intranetHomeForRole(intranetRole));
  }, [busy, intranetRole, loading, router, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const normalizedEmail = normalizeAuthEmail(email);
    const normalizedPassword = normalizeAuthPassword(password);

    if (!normalizedEmail || !normalizedPassword) {
      setMessage("Completa correo y contraseña.");
      setBusy(false);
      return;
    }

    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    if (error) {
      setMessage(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos. Si cambiaste tu clave recientemente, usa la nueva o restablécela desde el sitio público."
          : error.message
      );
      setBusy(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setMessage("No se pudo validar tu sesión. Intenta nuevamente.");
      setBusy(false);
      return;
    }

    await refreshProfile();

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("intranet_role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      setMessage("No pudimos verificar tu acceso interno. Intenta nuevamente.");
      setBusy(false);
      return;
    }

    const role = isIntranetRole(profileRow?.intranet_role) ? profileRow.intranet_role : null;

    if (!role) {
      setMessage("Tu cuenta no tiene acceso interno activo. Contacta a RR.HH. o al super administrador.");
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }

    if (role !== selectedProfile) {
      setSelectedProfile(role);
      setMessage(`Tu perfil interno es ${INTRANET_LOGIN_PROFILE_LABELS[role]}. Ingresando…`);
    }

    router.replace(intranetHomeForRole(role));
  }

  if (loading) {
    return <div className="centerState">Cargando intranet…</div>;
  }

  if (user && intranetRole) {
    return <div className="centerState">Redirigiendo a tu panel interno…</div>;
  }

  return (
    <main className="authPage intranetAuthPage">
      <section className="authCard intranetAuthCard">
        <div className="intranetAuthBrand">
          <div className="authLogo"><Building2 size={28} /></div>
          <p className="kicker">ACCESO INTERNO</p>
          <h1>Intranet ZOVIT</h1>
          <p className="muted">
            Ingresa con tu perfil interno y credenciales asignadas por administración o super administración.
          </p>
        </div>

        <form onSubmit={submit} className="formStack">
          <label>
            Perfil interno
            <div className="intranetSelectWrap">
              <select
                value={selectedProfile}
                onChange={(event) => setSelectedProfile(event.target.value as IntranetRole)}
              >
                {(Object.keys(INTRANET_LOGIN_PROFILE_LABELS) as IntranetRole[]).map((role) => (
                  <option key={role} value={role}>
                    {INTRANET_LOGIN_PROFILE_LABELS[role]}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </label>

          <label>
            Correo corporativo
            <div className="inputWithIcon">
              <Mail size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@zovit.cl"
                autoComplete="username"
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <small className="fieldHint">{PASSWORD_HINT}</small>
          </label>

          {message && (
            <div className="formMessage">
              <AlertCircle size={17} /> {message}
            </div>
          )}

          <button className="primaryButton wide" disabled={busy}>
            {busy ? "Validando acceso…" : <>Ingresar a intranet <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="authFooter">
          <Link href="/login">Recuperar contraseña</Link>
          {" · "}
          <Link href="/">Volver al sitio público</Link>
        </p>
      </section>
    </main>
  );
}
