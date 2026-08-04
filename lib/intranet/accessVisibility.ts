import type { IntranetPermission, IntranetRole } from "@/lib/auth/intranetRoles";

/** El super admin nunca es visible ni gestionable por RR.HH. u otros roles. */
export function isHiddenFromNonSuperAdmins(role: IntranetRole | null | undefined): boolean {
  return role === "super_admin";
}

/**
 * RR.HH. y demás roles ven todos los perfiles internos excepto el del super admin.
 * El super admin ve siempre todas las cuentas, sin restricciones.
 */
export function canViewerSeeIntranetAccount(
  viewerRole: IntranetRole,
  targetRole: IntranetRole,
): boolean {
  if (viewerRole === "super_admin") return true;
  return !isHiddenFromNonSuperAdmins(targetRole);
}

export function canViewerSeePlatformAccount(
  viewerRole: IntranetRole,
  target: { intranetRole: IntranetRole | null },
): boolean {
  if (viewerRole === "super_admin") return true;
  return !isHiddenFromNonSuperAdmins(target.intranetRole);
}

/** Permisos de dinero / todas las cuentas: el super admin real no los pierde en el paseo. */
export const SUPER_ADMIN_UNRESTRICTED_PERMISSIONS: IntranetPermission[] = [
  "manage_all_platform_accounts",
  "view_money_accounts",
  "view_financial_dashboard",
  "edit_financial_dashboard",
  "edit_payroll",
];

export function isSuperAdminUnrestrictedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/intranet/admin/gestion-usuarios") ||
    pathname.startsWith("/intranet/finanzas") ||
    pathname.startsWith("/admin/pagos")
  );
}

/**
 * Rol efectivo para gates de acceso.
 * El super admin real conserva poderes de cuentas/dinero aunque pasee como otro perfil.
 */
export function roleForAccessGate(input: {
  realRole: IntranetRole | null;
  simulatedRole: IntranetRole | null;
  pathname: string;
  permission?: IntranetPermission;
}): IntranetRole | null {
  const { realRole, simulatedRole, pathname, permission } = input;
  const base = simulatedRole ?? realRole;

  if (realRole !== "super_admin") return base;

  if (
    (permission && SUPER_ADMIN_UNRESTRICTED_PERMISSIONS.includes(permission)) ||
    isSuperAdminUnrestrictedPath(pathname)
  ) {
    return "super_admin";
  }

  return base;
}

export function hiddenAccountResponse() {
  return { error: "Usuario no encontrado." as const, status: 404 as const };
}
