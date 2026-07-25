"use client";

import { useAuth } from "@/components/AuthProvider";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
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
  const { isRealSuperAdmin } = useSuperAdminView();
  const [busy, setBusy] = useState(false);

  // Superadmin cambia de cuenta solo con el botón flotante.
  if (isRealSuperAdmin) return null;

  const activeMode = role ?? (profile ? getActiveMode(profile) : "client");
  const dual = profile ? hasDualMode(profile) : false;

  async function switchMode(nextMode: RoleMode) {
    if (!profile || busy || nextMode === activeMode || !showSwitcher) return;
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
      {dual ? (
        <div className="roleModeDual" role="group" aria-label="Modo de cuenta dual">
          {(["client", "professional"] as const).map((mode) => {
            const isActive = activeMode === mode;
            const canSwitch = showSwitcher && !busy && !isActive;
            return (
              <button
                key={mode}
                type="button"
                className={`roleModeBadge roleModeBadge--${mode} ${
                  isActive ? "roleModeBadge--active" : "roleModeBadge--idle"
                }`}
                aria-current={isActive ? "true" : undefined}
                aria-pressed={isActive}
                disabled={busy || !showSwitcher}
                onClick={() => {
                  if (canSwitch) void switchMode(mode);
                }}
              >
                {LABELS[mode]}
              </button>
            );
          })}
        </div>
      ) : (
        <span className={`roleModeBadge roleModeBadge--${activeMode} roleModeBadge--active`}>
          {LABELS[activeMode]}
        </span>
      )}
    </div>
  );
}
