export type UserRole = "client" | "professional" | "admin";

import type { IdentityStatus } from "@/lib/verification/types";
import { needsBiometricOnboarding } from "@/lib/verification/types";

export type RoleMode = "client" | "professional";

export type ProfileModeFields = {
  role: UserRole;
  can_act_as_client: boolean;
  can_act_as_professional: boolean;
  active_mode: RoleMode;
};

export function isRoleMode(value: string | null | undefined): value is RoleMode {
  return value === "client" || value === "professional";
}

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

export function getActiveMode(profile: ProfileModeFields | null | undefined): RoleMode {
  if (!profile) return "client";
  if (profile.role === "admin") return profile.active_mode;
  return profile.active_mode;
}

export function isClientMode(profile: ProfileModeFields | null | undefined): boolean {
  if (!profile) return true;
  if (profile.role === "admin") return profile.active_mode === "client";
  return profile.can_act_as_client && profile.active_mode === "client";
}

export function isProfessionalMode(profile: ProfileModeFields | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return profile.active_mode === "professional";
  return profile.can_act_as_professional && profile.active_mode === "professional";
}

export function hasDualMode(profile: ProfileModeFields | null | undefined): boolean {
  if (!profile) return false;
  return profile.can_act_as_client && profile.can_act_as_professional;
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

export function canAccessRoute(pathname: string, profile: ProfileModeFields | UserRole): boolean {
  const ctx: ProfileModeFields =
    typeof profile === "string"
      ? {
          role: profile,
          can_act_as_client: profile === "client" || profile === "admin",
          can_act_as_professional: profile === "professional" || profile === "admin",
          active_mode: profile === "professional" ? "professional" : "client",
        }
      : profile;

  if (pathname.startsWith("/admin")) {
    return ctx.role === "admin";
  }

  if (pathname.startsWith("/verificacion")) {
    return ctx.role === "admin" || (ctx.can_act_as_professional && ctx.active_mode === "professional");
  }

  if (pathname.startsWith("/pagos/profesional")) {
    return ctx.role === "admin" || (ctx.can_act_as_professional && ctx.active_mode === "professional");
  }

  if (pathname === "/pagos" || pathname.startsWith("/pagos/")) {
    if (pathname.startsWith("/pagos/profesional")) {
      return ctx.role === "admin" || (ctx.can_act_as_professional && ctx.active_mode === "professional");
    }
    return ctx.role === "admin" || (ctx.can_act_as_client && ctx.active_mode === "client");
  }

  if (pathname.startsWith("/trabajos") || pathname.startsWith("/experiencia")) {
    return ctx.role === "admin" || (ctx.can_act_as_professional && ctx.active_mode === "professional");
  }

  if (pathname === "/solicitudes/nueva" || pathname.startsWith("/solicitudes/nueva/")) {
    return canPublishServiceRequest(ctx);
  }

  return true;
}

export function canPublishServiceRequest(profile: ProfileModeFields | UserRole | null | undefined): boolean {
  if (!profile) return true;
  if (typeof profile === "string") {
    return profile === "client" || profile === "admin";
  }
  if (profile.role === "admin") return true;
  return profile.can_act_as_client && profile.active_mode === "client";
}

export function canAccessProfessionalFeatures(profile: ProfileModeFields | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.can_act_as_professional && profile.active_mode === "professional";
}

export function resolvePostLoginPath(
  nextPath: string | null,
  profile: ProfileModeFields,
  identityStatus?: IdentityStatus | null
): string {
  if (needsBiometricOnboarding(identityStatus)) {
    if (nextPath === "/registro/biometria") {
      return nextPath;
    }
    return "/registro/biometria";
  }

  const path = nextPath && nextPath.startsWith("/") ? nextPath : "/panel";
  return canAccessRoute(path, profile) ? path : "/panel";
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
