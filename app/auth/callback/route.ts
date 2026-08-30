import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/panel";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = safeNext(url.searchParams.get("next"));
  const providerError = url.searchParams.get("error");
  const providerErrorCode = url.searchParams.get("error_code");

  if (providerError || providerErrorCode) {
    const reason = providerErrorCode === "otp_expired" ? "expired" : "invalid";
    return NextResponse.redirect(
      `${origin}/login?confirm_error=${reason}&next=${encodeURIComponent(next)}`,
    );
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?confirm_error=invalid&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const reason = /expired|otp/i.test(error.message) ? "expired" : "invalid";
    return NextResponse.redirect(
      `${origin}/login?confirm_error=${reason}&next=${encodeURIComponent(next)}`,
    );
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(
    `${origin}/login?confirmed=1&next=${encodeURIComponent(next)}`,
  );
}
