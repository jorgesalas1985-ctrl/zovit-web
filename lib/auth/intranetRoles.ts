export type IntranetRole = "worker" | "supervisor" | "hr_admin" | "super_admin";

export const INTRANET_ROLES: IntranetRole[] = [
  "worker",
  "supervisor",
  "hr_admin",
  "super_admin",
];

export type IntranetPortal = "trabajadores" | "administrador" | "super_admin";

export const INTRANET_PORTAL_LABELS: Record<IntranetPortal, string> = {
  trabajadores: "Trabajadores ZOVIT",
  administrador: "Administrador (RR.HH.)",
  super_admin: "Super administrador",
};

export const INTRANET_LOGIN_PROFILE_LABELS: Record<IntranetRole, string> = {
  worker: "Trabajador ZOVIT",
  supervisor: "Supervisor",
  hr_admin: "Administrador (RR.HH.)",
  super_admin: "Super administrador",
};

export function isIntranetRole(value: string | null | undefined): value is IntranetRole {
  return !!value && INTRANET_ROLES.includes(value as IntranetRole);
}

export type IntranetPermission =
  | "view_own_personal_file"
  | "view_own_benefits"
  | "view_own_payroll"
  | "view_team_personal_files"
  | "view_all_personal_files"
  | "edit_payroll"
  | "view_financial_dashboard"
  | "edit_financial_dashboard"
  | "manage_intranet_users"
  | "manage_all_platform_accounts"
  | "view_money_accounts";

/**
 * Separación de poderes:
 * - hr_admin = solo Recursos Humanos (personal, verificación, credenciales internas).
 * - super_admin = dinero, estados de cuenta y revisión de todas las cuentas.
 */
const ROLE_PERMISSIONS: Record<IntranetRole, IntranetPermission[]> = {
  worker: ["view_own_personal_file", "view_own_benefits", "view_own_payroll"],
  supervisor: [
    "view_own_personal_file",
    "view_own_benefits",
    "view_own_payroll",
    "view_team_personal_files",
  ],
  hr_admin: [
    "view_own_personal_file",
    "view_own_benefits",
    "view_own_payroll",
    "view_all_personal_files",
    "manage_intranet_users",
  ],
  super_admin: [
    "view_own_personal_file",
    "view_own_benefits",
    "view_own_payroll",
    "view_all_personal_files",
    "edit_payroll",
    "view_financial_dashboard",
    "edit_financial_dashboard",
    "manage_intranet_users",
    "manage_all_platform_accounts",
    "view_money_accounts",
  ],
};

export function hasIntranetPermission(
  role: IntranetRole | null | undefined,
  permission: IntranetPermission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "super_admin";
}

export function intranetHomeForRole(role: IntranetRole): string {
  switch (role) {
    case "worker":
      return "/intranet/trabajador";
    case "supervisor":
      return "/intranet/supervisor";
    case "hr_admin":
      return "/intranet/admin";
    case "super_admin":
      return "/intranet/finanzas";
    default:
      return "/intranet";
  }
}

export function portalMatchesRole(portal: IntranetPortal, role: IntranetRole): boolean {
  if (portal === "trabajadores") return role === "worker" || role === "supervisor";
  if (portal === "administrador") return role === "hr_admin";
  return role === "super_admin";
}

export function requiredRolesForPath(pathname: string): IntranetRole[] | null {
  if (pathname.startsWith("/intranet/trabajador")) return ["worker"];
  if (pathname.startsWith("/intranet/supervisor")) return ["supervisor"];
  // Todas las cuentas de la plataforma: solo super admin.
  if (pathname.startsWith("/intranet/admin/gestion-usuarios")) return ["super_admin"];
  // Credenciales internas (trabajadores/supervisores): RR.HH. + super admin.
  if (pathname.startsWith("/intranet/admin/usuarios")) return ["hr_admin", "super_admin"];
  if (pathname.startsWith("/intranet/admin")) return ["hr_admin", "super_admin"];
  if (pathname.startsWith("/intranet/finanzas")) return ["super_admin"];
  if (pathname.startsWith("/intranet/equipo")) return ["supervisor", "hr_admin", "super_admin"];
  // Liquidaciones: cada uno ve las suyas; edición global solo super admin (vía permiso).
  if (pathname.startsWith("/intranet/liquidaciones")) {
    return ["worker", "supervisor", "hr_admin", "super_admin"];
  }
  if (pathname.startsWith("/intranet")) return INTRANET_ROLES;
  return null;
}

export function canAccessIntranetPath(pathname: string, role: IntranetRole): boolean {
  const allowed = requiredRolesForPath(pathname);
  if (!allowed) return false;
  if (role === "super_admin") return true;
  return allowed.includes(role);
}

export function assignableIntranetRoles(callerRole: IntranetRole): IntranetRole[] {
  if (callerRole === "super_admin") return [...INTRANET_ROLES];
  // RR.HH. solo crea personal operativo, nunca admins ni finanzas.
  if (callerRole === "hr_admin") return ["worker", "supervisor"];
  return [];
}
