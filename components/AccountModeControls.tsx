"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  getActiveMode,
  hasDualMode,
  isClientMode,
  isProfessionalMode,
  type RoleMode,
} from "@/lib/auth/roles";
import { BriefcaseBusiness, RefreshCw, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ModeAction = "activate_professional" | "activate_client" | "switch_mode";

async function callActivateMode(action: ModeAction, mode?: RoleMode) {
  const response = await fetch("/api/profile/activate-mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, mode }),
  });

  const data = (await response.json()) as { error?: string; redirect?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "No fue posible actualizar el modo de cuenta.");
  }

  return data;
}

type Props = {
  variant?: "panel" | "profile";
};

export function AccountModeControls({ variant = "panel" }: Props) {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!profile) return null;

  const dual = hasDualMode(profile);
  const activeMode = getActiveMode(profile);
  const canActivateProfessional = !profile.can_act_as_professional;
  const canActivateClient = !profile.can_act_as_client && profile.can_act_as_professional;

  async function run(action: ModeAction, mode?: RoleMode) {
    setBusy(true);
    setMessage("");
    try {
      const result = await callActivateMode(action, mode);
      await refreshProfile();
      if (result.redirect) {
        router.push(result.redirect);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "profile" && dual) {
    return (
      <section className="accountModeSection">
        <p className="kicker">MODO DE CUENTA</p>
        <h2>Cambiar entre cliente y profesional</h2>
        <p className="muted">
          Tu cuenta tiene acceso dual. Elige con qué rol quieres operar en ZOVIT.
        </p>
        <div className="accountModeSwitcher">
          <button
            type="button"
            className={`accountModeOption ${activeMode === "client" ? "accountModeOption--active" : ""}`}
            disabled={busy || activeMode === "client"}
            onClick={() => void run("switch_mode", "client")}
          >
            <UserRound size={18} /> Modo cliente
          </button>
          <button
            type="button"
            className={`accountModeOption ${activeMode === "professional" ? "accountModeOption--active" : ""}`}
            disabled={busy || activeMode === "professional"}
            onClick={() => void run("switch_mode", "professional")}
          >
            <BriefcaseBusiness size={18} /> Modo profesional
          </button>
        </div>
        {message && <div className="notice">{message}</div>}
      </section>
    );
  }

  return (
    <section className="accountModeSection">
      <p className="kicker">CUENTA DUAL</p>
      <h2>
        {isProfessionalMode(profile)
          ? "Operando como profesional"
          : isClientMode(profile)
            ? "Operando como cliente"
            : "Configura tu cuenta"}
      </h2>

      {canActivateProfessional && (
        <>
          <p className="muted">
            ¿Quieres ofrecer servicios? Activa tu cuenta profesional sin volver a registrarte.
          </p>
          <button
            type="button"
            className="primaryButton"
            disabled={busy}
            onClick={() => void run("activate_professional")}
          >
            <BriefcaseBusiness size={18} /> Activar cuenta profesional
          </button>
        </>
      )}

      {canActivateClient && (
        <>
          <p className="muted">
            ¿También quieres contratar servicios? Activa el modo cliente en tu cuenta.
          </p>
          <button
            type="button"
            className="secondaryButton"
            disabled={busy}
            onClick={() => void run("activate_client")}
          >
            <UserRound size={18} /> Activar modo cliente
          </button>
        </>
      )}

      {dual && variant === "panel" && (
        <>
          <p className="muted">Cambia entre contratar servicios y recibir trabajos.</p>
          <button
            type="button"
            className="whiteButton"
            disabled={busy}
            onClick={() =>
              void run("switch_mode", activeMode === "client" ? "professional" : "client")
            }
          >
            <RefreshCw size={18} />
            Cambiar a modo {activeMode === "client" ? "profesional" : "cliente"}
          </button>
        </>
      )}

      {message && <div className="notice">{message}</div>}
    </section>
  );
}
