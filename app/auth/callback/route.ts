import { getRedirectOrigin } from "@/lib/auth/redirects";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, key };
}

function resolveNextPath(next: string | null, type: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  if (type === "recovery" || type === "invite") {
    return "/auth/restablecer-clave";
  }

  return "/panel";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = getRedirectOrigin(requestUrl.origin);
  const code = searchParams.get("code");
  const next = resolveNextPath(searchParams.get("next"), searchParams.get("type"));

  if (!code) {
    const errorCode =
      searchParams.get("type") === "recovery" ? "callback-recuperacion" : "auth-callback";
    return NextResponse.redirect(`${origin}/login?error=${errorCode}`);
  }

  const { url, key } = getSupabaseEnv();
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorCode = searchParams.get("type") === "recovery" ? "callback-recuperacion" : "auth-callback";
    return NextResponse.redirect(`${origin}/login?error=${errorCode}`);
  }

  return response;
}
