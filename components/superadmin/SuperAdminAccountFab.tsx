"use client";

import { useAuth } from "@/components/AuthProvider";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { SUPER_ADMIN_TOUR_OPTIONS, type SuperAdminTourAccount } from "@/lib/auth/superAdminView";
import { BriefcaseBusiness, Building2, ChevronRight, ChevronUp, GraduationCap, Landmark, Shield, UserCog, UserRound, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ICONS: Record<SuperAdminTourAccount, typeof UserRound> = {
  client: UserRound, professional: BriefcaseBusiness, student: GraduationCap, company: Building2,
  institution: Landmark, admin: Shield, worker: Users, supervisor: UserCog, super_admin: Shield,
};

export function SuperAdminAccountFab() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isRealSuperAdmin, tourAccount, setTourAccount } = useSuperAdminView();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!fabRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);
  if (!isRealSuperAdmin || !profile) return null;

  const currentLabel = SUPER_ADMIN_TOUR_OPTIONS.find((option) => option.id === tourAccount)?.label ?? "Super administrador";
  async function switchAccount(account: SuperAdminTourAccount) {
    if (busy) return;
    setBusy(true);
    setTourAccount(account);
    try {
      const href = SUPER_ADMIN_TOUR_OPTIONS.find((option) => option.id === account)?.href ?? "/panel";
      setOpen(false);
      router.push(href);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div ref={fabRef} className={`superAdminFab ${open ? "superAdminFab--open" : ""} ${hidden ? "superAdminFab--hidden" : ""}`} role="region" aria-label="Cambiar tipo de cuenta (superadmin)">
      {hidden ? (
        <button type="button" className="superAdminFabRestore" aria-label="Mostrar selector de cuenta" title="Mostrar selector" onClick={() => setHidden(false)}><ChevronUp size={18} /></button>
      ) : <>
        {open && <div className="superAdminFabMenu" role="menu">
          <p className="superAdminFabMenuTitle">Cambiar de cuenta</p>
          {SUPER_ADMIN_TOUR_OPTIONS.map((option) => {
            const Icon = ICONS[option.id];
            const active = tourAccount === option.id;
            return <button key={option.id} type="button" role="menuitem" className={`superAdminFabItem ${active ? "isActive" : ""}`} disabled={busy || active} onClick={() => void switchAccount(option.id)}><Icon size={16} aria-hidden /><span>{option.label}</span></button>;
          })}
        </div>}
        <button type="button" className="superAdminFabButton" aria-expanded={open} aria-haspopup="menu" disabled={busy} onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} /> : <ChevronUp size={20} />}<span>{busy ? "Cambiando…" : currentLabel}</span>
        </button>
        <button type="button" className="superAdminFabHide" aria-label="Ocultar selector de cuenta" title="Ocultar" onClick={() => { setOpen(false); setHidden(true); }}><ChevronRight size={17} /></button>
      </>}
    </div>
  );
}
