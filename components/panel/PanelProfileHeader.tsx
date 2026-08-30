"use client";

import type { SuperAdminTourAccount } from "@/lib/auth/superAdminView";

const LABELS: Record<SuperAdminTourAccount, string> = {
  client: "CLIENTE ZOVIT",
  professional: "PROFESIONAL ZOVIT",
  student: "ALUMNO ZOVIT",
  company: "EMPRESA ZOVIT",
  institution: "INSTITUCIÓN ZOVIT",
  admin: "ADMINISTRADOR (RR.HH.)",
  worker: "TRABAJADOR ZOVIT",
  supervisor: "SUPERVISOR ZOVIT",
  super_admin: "SUPERADMINISTRADOR",
};

export function PanelProfileHeader({ account, personName }: { account: SuperAdminTourAccount; personName?: string | null }) {
  void personName;
  const label = LABELS[account];
  return (
    <section className={`panelProfileHeader panelProfileHeader--${account}`} aria-label={`Perfil ${label}`}>
      <strong className="panelProfileBadge">{label}</strong>
    </section>
  );
}
