import type { IntranetRole } from "@/lib/auth/intranetRoles";

/** Cuentas internas visibles solo para super administrador. */
export const SUPER_ADMIN_ONLY_INTRANET_ROLES: IntranetRole[] = ["super_admin", "hr_admin"];

export function isSuperAdminOnlyIntranetRole(role: IntranetRole): boolean {
  return SUPER_ADMIN_ONLY_INTRANET_ROLES.includes(role);
}

export function canViewerSeeIntranetAccount(
  viewerRole: IntranetRole,
  targetRole: IntranetRole
): boolean {
  if (viewerRole === "super_admin") return true;
  return !isSuperAdminOnlyIntranetRole(targetRole);
}

export function canViewerSeePlatformAccount(
  viewerRole: IntranetRole,
  target: { intranetRole: IntranetRole | null }
): boolean {
  if (viewerRole === "super_admin") return true;
  if (!target.intranetRole) return true;
  return !isSuperAdminOnlyIntranetRole(target.intranetRole);
}

export function hiddenAccountResponse() {
  return { error: "Usuario no encontrado." as const, status: 404 as const };
}
