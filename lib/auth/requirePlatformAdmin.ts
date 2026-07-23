import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  return { supabase, user: authData.user };
}

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, identity_status, identity_verified, biometric_verified, identity_verified_at, identity_submitted_at, identity_rejection_reason, study_verification_status, study_verified, study_submitted_at, study_rejection_reason, rut")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile?.role) {
    return { error: NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 }) };
  }

  return { supabase, user: authData.user, profile };
}
