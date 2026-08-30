"use client";

import { useAuth } from "@/components/AuthProvider";
import { ProfileSectionMenu } from "@/components/panel/ProfileSectionMenu";
import { getEcosystemNavigation } from "@/lib/ecosystem/navigation";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import type { EcosystemRole } from "@/lib/ecosystem/roles";
import { resolvePanelViewMode } from "@/lib/auth/roles";

const TOUR_ROLE: Record<string, EcosystemRole> = {
  client: "client",
  professional: "professional",
  student: "student",
  company: "company",
  institution: "institution",
  admin: "administrator",
  supervisor: "evaluator",
  super_admin: "superadmin",
};

export function EcosystemAccessGrid() {
  const { profile } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const forcedRole = isRealSuperAdmin ? TOUR_ROLE[tourAccount] : undefined;
  const isClientView = isRealSuperAdmin
    ? tourAccount === "client"
    : resolvePanelViewMode(profile) === "client";
  const isProfessionalView = isRealSuperAdmin
    ? tourAccount === "professional"
    : resolvePanelViewMode(profile) === "professional";
  const items = (isRealSuperAdmin && tourAccount === "worker" ? [] : getEcosystemNavigation(profile, { forceRole: forcedRole })).filter((item) =>
    (isRealSuperAdmin && tourAccount === "super_admin") || (!item.roles.includes("superadmin") && !item.href.startsWith("/intranet/finanzas") && !item.href.startsWith("/intranet/superadmin")),
  ).filter((item) => {
    if (isClientView) {
      return item.id === "client-map" || item.id === "client-requests";
    }
    return true;
  });
  if (!items.length) return null;
  return (
    <section className="panelSection compactSection unifiedSectionAccess">
      <ProfileSectionMenu
        title={isClientView ? "Buscar profesionales cercanos y crear solicitudes" : undefined}
        options={[
          ...items.map(({ href, label, description }) => ({ href, label, description })),
          ...(isProfessionalView ? [
            { href: "/reputacion-zovit", label: "Reputación ZOVIT", description: "Revisa tu progreso, experiencia y calificación." },
            { href: "/gestion-personal", label: "Gestión personal", description: "Administra tu perfil, documentos y herramientas." },
            { href: "/mis-trabajos", label: "Actividad · Mis trabajos", description: "Consulta trabajos activos, finalizados y cancelados." },
          ] : []),
        ]}
      />
    </section>
  );
}
