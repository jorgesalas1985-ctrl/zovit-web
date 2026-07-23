"use client";

import { ShieldCheck } from "lucide-react";
import type { UserRole } from "@/lib/auth/roles";

type IdentityBadgeProps = {
  verified: boolean;
  role?: UserRole | "client" | "professional";
  compact?: boolean;
};

export function IdentityBadge({ verified, role = "client", compact = false }: IdentityBadgeProps) {
  if (!verified) return null;

  const label =
    role === "professional" || role === "admin"
      ? compact
        ? "Verificado"
        : "Profesional verificado ZOVIT"
      : compact
        ? "Verificado"
        : "Identidad verificada ZOVIT";

  return (
    <span className="identityBadge" title={label}>
      <ShieldCheck size={14} />
      {label}
    </span>
  );
}

export function IdentityStatusPill({ status }: { status: "none" | "pending" | "approved" | "rejected" }) {
  const labels = {
    none: "Sin verificar",
    pending: "En revisión",
    approved: "Verificado",
    rejected: "Rechazado",
  };

  return <span className={`identityStatusPill identityStatusPill--${status}`}>{labels[status]}</span>;
}
