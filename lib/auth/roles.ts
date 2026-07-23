export type UserRole = "client" | "professional" | "admin";

import type { IdentityStatus } from "@/lib/verification/types";
import { needsBiometricOnboarding } from "@/lib/verification/types";

export type RoleMode = "client" | "professional";

export function resolveRoleMode(
  allowedRoles: UserRole[],
  profileRole: UserRole
): RoleMode | null {
  const hasClient = allowedRoles.includes("client");
  const hasProfessional = allowedRoles.includes("professional");

  if (hasClient && !hasProfessional) return "client";
  if (hasProfessional && !hasClient) return "professional";

  if (hasClient && hasProfessional) {
    if (profileRole === "professional") return "professional";
    if (profileRole === "client" || profileRole === "admin") return "client";
  }

  return null;
}

export const USER_ROLES: UserRole[] = ["client", "professional", "admin"];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return !!value && USER_ROLES.includes(value as UserRole);
}

export function isPublicIntranetRoute(pathname: string): boolean {
  return pathname === "/intranet" || pathname === "/intranet/acceso";
}

export function isProtectedRoute(pathname: string): boolean {
  if (isPublicIntranetRoute(pathname)) return false;

  return (
    pathname.startsWith("/panel") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/verificacion") ||
    pathname.startsWith("/registro/biometria") ||
    pathname.startsWith("/experiencia") ||
    pathname.startsWith("/solicitudes") ||
    pathname.startsWith("/trabajos") ||
    pathname.startsWith("/pagos") ||
    pathname.startsWith("/intranet") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth/restablecer-clave")
  );
}

export function canAccessRoute(pathname: string, role: UserRole): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }

  if (pathname.startsWith("/verificacion")) {
    return role === "professional" || role === "admin";
  }

  if (pathname.startsWith("/pagos/profesional")) {
    return role === "professional" || role === "admin";
  }

  if (pathname === "/pagos" || pathname.startsWith("/pagos/")) {
    return role === "client" || role === "admin";
  }

  if (pathname.startsWith("/trabajos") || pathname.startsWith("/experiencia")) {
    return role === "professional" || role === "admin";
  }

  if (pathname === "/solicitudes/nueva" || pathname.startsWith("/solicitudes/nueva/")) {
    return role === "client" || role === "professional" || role === "admin";
  }

  return true;
}

export function resolvePostLoginPath(
  nextPath: string | null,
  role: UserRole,
  identityStatus?: IdentityStatus | null
): string {
  if (needsBiometricOnboarding(identityStatus)) {
    if (nextPath === "/registro/biometria") {
      return nextPath;
    }
    return "/registro/biometria";
  }

  const path = nextPath && nextPath.startsWith("/") ? nextPath : "/panel";
  return canAccessRoute(path, role) ? path : "/panel";
}

export function roleErrorMessage(code: string): string {
  switch (code) {
    case "perfil-incompleto":
      return "Tu cuenta no tiene un perfil válido en ZOVIT. Contacta soporte o vuelve a registrarte.";
    case "sin-permiso":
      return "No tienes permiso para acceder a esa sección.";
    case "auth-callback":
      return "No fue posible completar la autenticación. Intenta nuevamente.";
    case "callback-recuperacion":
      return "No fue posible validar el enlace de recuperación. Solicita uno nuevo e intenta otra vez.";
    default:
      return "Ocurrió un error de acceso. Intenta nuevamente.";
  }
}
