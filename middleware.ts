import { type NextRequest, NextResponse } from "next/server";
import { isProtectedRoute } from "@/lib/auth/roles";
import { mergeCookies, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/perfil/:path*",
    "/solicitudes/:path*",
    "/trabajos/:path*",
    "/auth/restablecer-clave",
  ],
};
