export type UserRole = "client" | "professional" | "admin";

export const USER_ROLES: UserRole[] = ["client", "professional", "admin"];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return !!value && USER_ROLES.includes(value as UserRole);
}

export function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/panel") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/experiencia") ||
    pathname.startsWith("/solicitudes") ||
    pathname.startsWith("/trabajos") ||
    pathname.startsWith("/pagos") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth/restablecer-clave")
  );
}

export function canAccessRoute(pathname: string, role: UserRole): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "admin";
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

export function resolvePostLoginPath(nextPath: string | null, role: UserRole): string {
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
