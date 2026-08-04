import {
  ecosystemRolesFromProfile,
  hasEcosystemPermission,
  type EcosystemPermission,
  type EcosystemProfileInput,
  type EcosystemRole,
} from "@/lib/ecosystem/roles";

export type EcosystemNavItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  roles: EcosystemRole[];
  permission?: EcosystemPermission;
  current: boolean;
};

const NAV_ITEMS: EcosystemNavItem[] = [
  {
    id: "client-map",
    label: "Mapa de profesionales",
    description: "Buscar profesionales cercanos y crear solicitudes.",
    href: "/cliente/mapa",
    roles: ["client"],
    permission: "use_client_services",
    current: true,
  },
  {
    id: "client-requests",
    label: "Nueva solicitud",
    description: "Publicar una necesidad de servicio.",
    href: "/solicitudes/nueva",
    roles: ["client"],
    permission: "use_client_services",
    current: true,
  },
  {
    id: "professional-jobs",
    label: "Trabajos disponibles",
    description: "Revisar solicitudes y enviar propuestas.",
    href: "/trabajos",
    roles: ["professional"],
    permission: "offer_services",
    current: true,
  },
  {
    id: "professional-experience",
    label: "Experiencia verificada",
    description: "Ver historial y reputacion profesional.",
    href: "/experiencia",
    roles: ["professional"],
    permission: "offer_services",
    current: true,
  },
  {
    id: "professional-verification",
    label: "Verificacion gratuita",
    description: "Revisar documentos profesionales.",
    href: "/verificacion",
    roles: ["professional"],
    permission: "offer_services",
    current: true,
  },
  {
    id: "evaluator-intranet",
    label: "Panel evaluador",
    description: "Revisar equipo y casos asignados.",
    href: "/intranet/supervisor",
    roles: ["evaluator"],
    permission: "review_evaluations",
    current: true,
  },
  {
    id: "admin-documents",
    label: "Revision documental",
    description: "Verificacion de identidad y perfiles de servicio.",
    href: "/intranet/admin",
    roles: ["administrator"],
    permission: "review_documents",
    current: true,
  },
  {
    id: "superadmin-money",
    label: "Super administracion",
    description: "Dineros, cuentas y auditoria global.",
    href: "/intranet/finanzas",
    roles: ["superadmin"],
    permission: "manage_money",
    current: true,
  },
  {
    id: "superadmin-users",
    label: "Todas las cuentas",
    description: "Gestion completa de cuentas de la plataforma.",
    href: "/intranet/admin/gestion-usuarios",
    roles: ["superadmin"],
    permission: "manage_users",
    current: true,
  },
  {
    id: "student-passport",
    label: "Pasaporte Digital ZOVIT",
    description: "Identidad, formacion, competencias y estado operativo.",
    href: "/panel/pasaporte",
    roles: ["student", "professional", "client"],
    current: true,
  },
  {
    id: "company-tools",
    label: "Panel Empresa",
    description: "Oportunidades, requisitos y brechas.",
    href: "/empresa",
    roles: ["company"],
    permission: "access_company_tools",
    current: false,
  },
  {
    id: "institution-reports",
    label: "Panel Institucion",
    description: "Reportes agregados de competencias y empleabilidad.",
    href: "/institucion",
    roles: ["institution"],
    permission: "access_institution_reports",
    current: false,
  },
  {
    id: "superadmin-ai",
    label: "ZOVIT IA",
    description: "Gobernanza futura de IA.",
    href: "/intranet/superadmin/ia",
    roles: ["superadmin"],
    permission: "govern_ai",
    current: false,
  },
  {
    id: "superadmin-ocr",
    label: "ZOVIT OCR",
    description: "Gobernanza futura de OCR.",
    href: "/intranet/superadmin/ocr",
    roles: ["superadmin"],
    permission: "govern_ocr",
    current: false,
  },
  {
    id: "founder-vault",
    label: "Founder Vault",
    description: "Boveda fundacional privada.",
    href: "/intranet/superadmin/founder-vault",
    roles: ["superadmin"],
    permission: "access_founder_vault",
    current: false,
  },
];

export function getEcosystemNavigation(
  profile: EcosystemProfileInput | null | undefined,
  options: { includeFuture?: boolean } = {},
): EcosystemNavItem[] {
  const roles = ecosystemRolesFromProfile(profile);
  const includeFuture = options.includeFuture ?? false;

  return NAV_ITEMS.filter((item) => {
    if (!includeFuture && !item.current) return false;
    if (!item.roles.some((role) => roles.includes(role))) return false;
    if (item.permission && !hasEcosystemPermission(profile, item.permission)) return false;
    return true;
  });
}
