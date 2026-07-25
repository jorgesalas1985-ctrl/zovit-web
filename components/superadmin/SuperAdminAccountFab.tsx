"use client";

import { useAuth } from "@/components/AuthProvider";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import {
  SUPER_ADMIN_TOUR_OPTIONS,
  type SuperAdminTourAccount,
} from "@/lib/auth/superAdminView";
import {
  BriefcaseBusiness,
  ChevronUp,
  Shield,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ICONS: Record<SuperAdminTourAccount, typeof UserRound> = {
  client: UserRound,
  professional: BriefcaseBusiness,
  admin: Shield,
  worker: Users,
  supervisor: UserCog,
  super_admin: Shield,
};

export function SuperAdminAccountFab() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { isRealSuperAdmin, tourAccount, setTourAccount } = useSuperAdminView();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll() {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;

      if (current < 24) {
        setHiddenByScroll(false);
      } else if (delta > 8) {
        setHiddenByScroll(true);
        setOpen(false);
      } else if (delta < -8) {
        setHiddenByScroll(false);
      }

      lastScrollY.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!isRealSuperAdmin || !profile) return null;

  const currentLabel =
    SUPER_ADMIN_TOUR_OPTIONS.find((option) => option.id === tourAccount)?.label ??
    "Super administrador";

  async function switchAccount(account: SuperAdminTourAccount) {
    if (busy) return;
    setBusy(true);
    setTourAccount(account);

    try {
      if (account === "client" || account === "professional") {
        const response = await fetch("/api/profile/activate-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "switch_mode", mode: account }),
        });
        if (response.ok) {
          await refreshProfile();
        }
      }

      const href =
        SUPER_ADMIN_TOUR_OPTIONS.find((option) => option.id === account)?.href ?? "/panel";
      setOpen(false);
      router.push(href);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`superAdminFab ${hiddenByScroll ? "superAdminFab--hidden" : ""} ${
        open ? "superAdminFab--open" : ""
      }`}
      role="region"
      aria-label="Cambiar tipo de cuenta (superadmin)"
    >
      {open && (
        <div className="superAdminFabMenu" role="menu">
          <p className="superAdminFabMenuTitle">Cambiar de cuenta</p>
          {SUPER_ADMIN_TOUR_OPTIONS.map((option) => {
            const Icon = ICONS[option.id];
            const active = tourAccount === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                className={`superAdminFabItem ${active ? "isActive" : ""}`}
                disabled={busy || active}
                onClick={() => void switchAccount(option.id)}
              >
                <Icon size={16} aria-hidden />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="superAdminFabButton"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <ChevronUp size={20} />}
        <span>{busy ? "Cambiando…" : currentLabel}</span>
      </button>
    </div>
  );
}
