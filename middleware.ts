import { type NextRequest, NextResponse } from "next/server";
import { canAccessRoute, isProtectedRoute, isUserRole } from "@/lib/auth/roles";
import { mergeCookies, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
    .select("role")
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/perfil/:path*",
    "/experiencia/:path*",
    "/solicitudes/:path*",
    "/trabajos/:path*",
    "/pagos/:path*",
    "/admin/:path*",
    "/auth/restablecer-clave",
  ],
};
