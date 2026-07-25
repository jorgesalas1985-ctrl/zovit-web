import type { IntranetRole } from "@/lib/auth/intranetRoles";

/** El super admin nunca es visible ni gestionable por RR.HH. u otros roles. */
export function isHiddenFromNonSuperAdmins(role: IntranetRole | null | undefined): boolean {
  return role === "super_admin";
}

/**
 * RR.HH. y demás roles ven todos los perfiles internos excepto el del super admin.
 * Solo el super admin se ve a sí mismo y al resto.
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

export function hiddenAccountResponse() {
  return { error: "Usuario no encontrado." as const, status: 404 as const };
}
