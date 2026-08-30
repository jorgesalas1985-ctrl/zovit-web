import { isZovitSuperAdmin } from "@/lib/auth/superAdminOwner";

/** Super admin real: acceso total sin biometría, modos ni permisos de plataforma. */
export function hasUnrestrictedSuperAdminAccess(
  intranetRole: string | null | undefined,
  email?: string | null,
): boolean {
  return email ? isZovitSuperAdmin(email, intranetRole) : false;
}
