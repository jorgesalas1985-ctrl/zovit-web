import { type NextRequest, NextResponse } from "next/server";
import {
  canAccessRoute,
  isPublicIntranetRoute,
  isProtectedRoute,
  isRoleMode,
  isUserRole,
  type ProfileModeFields,
} from "@/lib/auth/roles";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { applySecurityHeaders } from "@/lib/security/headers";
import { needsBiometricOnboarding, canAccessPanel } from "@/lib/verification/types";
import { mergeCookies, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  applySecurityHeaders(supabaseResponse);

  if (isPublicIntranetRoute(pathname)) {
    return supabaseResponse;
  }

  if (!isProtectedRoute(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(mergeCookies(supabaseResponse, NextResponse.redirect(loginUrl)));
  }

  if (pathname.startsWith("/auth/restablecer-clave")) {
    return supabaseResponse;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "role, can_act_as_client, can_act_as_professional, active_mode, identity_status, intranet_role",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !isUserRole(profile?.role)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "perfil-incompleto");
    loginUrl.searchParams.delete("next");
    return applySecurityHeaders(mergeCookies(supabaseResponse, NextResponse.redirect(loginUrl)));
  }

  const registrationRole = profile.role;
  const profileMode: ProfileModeFields = {
    role: registrationRole,
    can_act_as_client:
      typeof profile.can_act_as_client === "boolean"
        ? profile.can_act_as_client
        : registrationRole === "client" || registrationRole === "admin",
    can_act_as_professional:
      typeof profile.can_act_as_professional === "boolean"
        ? profile.can_act_as_professional
        : registrationRole === "professional" || registrationRole === "admin",
    active_mode: isRoleMode(profile.active_mode)
      ? profile.active_mode
      : registrationRole === "professional"
        ? "professional"
        : "client",
  };

  // Intranet: requiere rol intranet real (no basta estar logueado).
  if (pathname.startsWith("/intranet") && !isPublicIntranetRoute(pathname)) {
    if (!isIntranetRole(profile.intranet_role) && registrationRole !== "admin") {
      const accesoUrl = request.nextUrl.clone();
      accesoUrl.pathname = "/intranet/acceso";
      accesoUrl.searchParams.set("error", "sin-permiso");
      return applySecurityHeaders(mergeCookies(supabaseResponse, NextResponse.redirect(accesoUrl)));
    }
  }

  if (!canAccessRoute(pathname, profileMode)) {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = "/panel";
    panelUrl.searchParams.set("error", "sin-permiso");
    return applySecurityHeaders(mergeCookies(supabaseResponse, NextResponse.redirect(panelUrl)));
  }

  const identityStatus = profile.identity_status as
    | "none"
    | "pending"
    | "approved"
    | "rejected"
    | null;

  if (pathname.startsWith("/registro/biometria") && canAccessPanel(identityStatus)) {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = "/panel";
    panelUrl.search = "";
    return applySecurityHeaders(mergeCookies(supabaseResponse, NextResponse.redirect(panelUrl)));
  }

  const requiresIdentityGate =
    pathname.startsWith("/panel") ||
    pathname.startsWith("/solicitudes/nueva") ||
    pathname.startsWith("/trabajos") ||
    pathname === "/pagos" ||
    pathname.startsWith("/pagos/");

  if (requiresIdentityGate && needsBiometricOnboarding(identityStatus)) {
    const biometricUrl = request.nextUrl.clone();
    biometricUrl.pathname = "/registro/biometria";
    biometricUrl.search = "";
    return applySecurityHeaders(
      mergeCookies(supabaseResponse, NextResponse.redirect(biometricUrl)),
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
