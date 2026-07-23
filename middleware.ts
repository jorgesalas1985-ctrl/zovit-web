import { type NextRequest, NextResponse } from "next/server";
import { canAccessRoute, isPublicIntranetRoute, isProtectedRoute, isUserRole } from "@/lib/auth/roles";
import { needsBiometricOnboarding, canAccessPanel } from "@/lib/verification/types";
import { mergeCookies, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
    return mergeCookies(supabaseResponse, NextResponse.redirect(loginUrl));
  }

  if (pathname.startsWith("/auth/restablecer-clave")) {
    return supabaseResponse;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, identity_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !isUserRole(profile?.role)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "perfil-incompleto");
    loginUrl.searchParams.delete("next");
    return mergeCookies(supabaseResponse, NextResponse.redirect(loginUrl));
  }

  if (!canAccessRoute(pathname, profile.role)) {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = "/panel";
    panelUrl.searchParams.set("error", "sin-permiso");
    return mergeCookies(supabaseResponse, NextResponse.redirect(panelUrl));
  }

  const identityStatus = profile.identity_status as "none" | "pending" | "approved" | "rejected" | null;

  if (pathname.startsWith("/registro/biometria") && canAccessPanel(identityStatus)) {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = "/panel";
    panelUrl.search = "";
    return mergeCookies(supabaseResponse, NextResponse.redirect(panelUrl));
  }

  if (pathname.startsWith("/panel") && needsBiometricOnboarding(identityStatus)) {
    const biometricUrl = request.nextUrl.clone();
    biometricUrl.pathname = "/registro/biometria";
    biometricUrl.search = "";
    return mergeCookies(supabaseResponse, NextResponse.redirect(biometricUrl));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/panel",
    "/panel/:path*",
    "/perfil/:path*",
    "/verificacion/:path*",
    "/registro/biometria",
    "/experiencia/:path*",
    "/solicitudes/:path*",
    "/trabajos/:path*",
    "/pagos/:path*",
    "/intranet/:path*",
    "/admin/:path*",
    "/auth/restablecer-clave",
  ],
};
