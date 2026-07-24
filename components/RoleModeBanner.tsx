"use client";

import { useAuth } from "@/components/AuthProvider";
import { getActiveMode, hasDualMode, type RoleMode } from "@/lib/auth/roles";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LABELS: Record<RoleMode, string> = {
  client: "CLIENTE",
  professional: "PROFESIONAL",
};

type RoleModeBannerProps = {
  role?: RoleMode;
  variant?: "dashboard" | "page";
  showSwitcher?: boolean;
};

export function RoleModeBanner({ role, variant = "dashboard", showSwitcher = true }: RoleModeBannerProps) {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);

  const activeMode = role ?? (profile ? getActiveMode(profile) : "client");
  const dual = profile ? hasDualMode(profile) : false;

  async function switchMode(nextMode: RoleMode) {
    if (!profile || busy || nextMode === activeMode) return;
    setBusy(true);
    try {
      const response = await fetch("/api/profile/activate-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch_mode", mode: nextMode }),
      });
      const data = (await response.json()) as { error?: string; redirect?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible cambiar el modo.");
      }
      await refreshProfile();
      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`roleModeBanner roleModeBanner--${variant}`} aria-label={`Modo ${LABELS[activeMode]}`}>
      {dual && showSwitcher ? (
        <div className="roleModeSwitcher">
          <button
            type="button"
            className={`roleModeSwitchBtn ${activeMode === "client" ? "roleModeSwitchBtn--active" : ""}`}
            disabled={busy || activeMode === "client"}
            onClick={() => void switchMode("client")}
          >
            Cliente
          </button>
          <button
            type="button"
            className={`roleModeSwitchBtn ${activeMode === "professional" ? "roleModeSwitchBtn--active" : ""}`}
            disabled={busy || activeMode === "professional"}
            onClick={() => void switchMode("professional")}
          >
            Profesional
          </button>
        </div>
      ) : (
        <span className={`roleModeBadge roleModeBadge--${activeMode}`}>{LABELS[activeMode]}</span>
      )}
    </div>
  );
}
