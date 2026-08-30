import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/security/validation";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    const { data: actor } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
    if (actor?.intranet_role !== "super_admin") {
      return NextResponse.json({ error: "Solo el superadministrador puede aprobar sin verificación." }, { status: 403 });
    }

    const body = await request.json() as { profileId?: string; confirmation?: string };
    const profileId = String(body.profileId ?? "");
    if (!isValidUuid(profileId)) return NextResponse.json({ error: "Cuenta no válida." }, { status: 400 });
    if (body.confirmation !== "APROBAR SIN VERIFICACION") {
      return NextResponse.json({ error: "Confirmación de seguridad incorrecta." }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data: target, error: targetError } = await admin.from("profiles").select("id,intranet_role").eq("id", profileId).maybeSingle();
    if (targetError || !target) return NextResponse.json({ error: "No se encontró la cuenta." }, { status: 404 });
    if (target.intranet_role === "super_admin") return NextResponse.json({ error: "La cuenta protegida del superadministrador no usa esta excepción." }, { status: 400 });

    const { error } = await admin.from("profiles").update({
      identity_status: "approved",
      identity_verified: true,
      biometric_verified: true,
      identity_verified_at: now,
      identity_rejection_reason: null,
      identity_ai_status: "manual_override",
      identity_ai_summary: `Aprobación excepcional sin OCR autorizada por superadministrador el ${now}.`,
      identity_ai_at: now,
      birth_date_admin_corroborated: false,
      birth_date_admin_corroborated_at: null,
      birth_date_admin_corroborated_by: data.user.id,
      updated_at: now,
    }).eq("id", profileId);
    if (error) throw error;

    await admin.from("identity_documents").update({
      status: "approved",
      reviewed_by: data.user.id,
      reviewed_at: now,
      admin_notes: "Aprobación excepcional sin verificación automática, autorizada por superadministrador.",
      updated_at: now,
    }).eq("profile_id", profileId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo aprobar la cuenta." }, { status: 500 });
  }
}
