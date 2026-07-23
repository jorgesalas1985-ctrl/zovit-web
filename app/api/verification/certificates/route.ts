import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { canAccessStudyCertificates } from "@/lib/verification/types";

export async function POST() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    if (!canAccessStudyCertificates(auth.profile.role)) {
      return NextResponse.json(
        { error: "Solo profesionales pueden enviar certificados de estudios." },
        { status: 403 }
      );
    }

    const { supabase } = auth;
    const { error } = await supabase.rpc("submit_study_certificate_verification");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
