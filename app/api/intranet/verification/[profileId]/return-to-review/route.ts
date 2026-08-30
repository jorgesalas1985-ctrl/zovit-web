import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function authorize() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.intranet_role !== "hr_admin" && profile?.intranet_role !== "super_admin") return null;
  return { supabase, userId: data.user.id };
}

/** Devuelve una identidad aprobada a la cola para una revisión manual completa. */
export async function POST(_request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    const actor = await authorize();
    if (!actor) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });

    const { profileId } = await context.params;
    const now = new Date().toISOString();
    const admin = createAdminClient();
    const { data: updatedProfiles, error } = await admin
      .from("profiles")
      .update({
        identity_status: "pending",
        identity_verified: false,
        biometric_verified: false,
        identity_verified_at: null,
        identity_rejection_reason: null,
        birth_date_admin_corroborated: false,
        birth_date_admin_corroborated_at: null,
        birth_date_admin_corroborated_by: null,
        identity_ai_status: "dudoso",
        identity_ai_summary: "Identidad devuelta a revisión manual por administración.",
        identity_ai_at: now,
        updated_at: now,
      })
      .eq("id", profileId)
      .eq("identity_status", "approved")
      .select("id");
    if (error) throw error;
    if (!updatedProfiles?.length) {
      return NextResponse.json({ error: "La identidad ya no está aprobada." }, { status: 409 });
    }

    const { error: documentsError } = await admin
      .from("identity_documents")
      .update({
        status: "uploaded",
        reviewed_by: null,
        reviewed_at: null,
        admin_notes: "Devuelto a revisión manual.",
        updated_at: now,
      })
      .eq("profile_id", profileId);
    if (documentsError) throw documentsError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo devolver la identidad a revisión." },
      { status: 500 },
    );
  }
}
