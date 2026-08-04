import { isSuperAdminRole } from "@/lib/auth/intranetRoles";

/** Super admin real: acceso total sin biometría, modos ni permisos de plataforma. */
export function hasUnrestrictedSuperAdminAccess(
  intranetRole: string | null | undefined,
): boolean {
  return isSuperAdminRole(intranetRole);
}
