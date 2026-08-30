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

export async function POST(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    const actor = await authorize();
    if (!actor) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });

    const { profileId } = await context.params;
    const body = await request.json() as {
      action?: "approve" | "reject";
      reason?: string;
      carnetBirthDateMatches?: boolean;
      biometricFaceMatches?: boolean;
    };
    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "Acción de revisión inválida." }, { status: 400 });
    }
    if (body.action === "approve" && !body.carnetBirthDateMatches) {
      return NextResponse.json({ error: "Confirma que la fecha del carnet coincide antes de aprobar." }, { status: 400 });
    }
    if (body.action === "approve" && !body.biometricFaceMatches) {
      return NextResponse.json({ error: "Confirma la comparación visual entre carnet, selfie y prueba de vida antes de aprobar." }, { status: 400 });
    }
    if (body.action === "reject" && !body.reason?.trim()) {
      return NextResponse.json({ error: "Indica un motivo de rechazo." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const approved = body.action === "approve";
    const admin = createAdminClient();
    const { data: updatedProfiles, error } = await admin
      .from("profiles")
      .update({
        identity_status: approved ? "approved" : "rejected",
        identity_verified: approved,
        biometric_verified: approved,
        identity_verified_at: approved ? now : null,
        identity_rejection_reason: approved ? null : body.reason?.trim() ?? null,
        birth_date_admin_corroborated: approved,
        birth_date_admin_corroborated_at: approved ? now : null,
        birth_date_admin_corroborated_by: approved ? actor.userId : null,
        identity_ai_status: approved ? "approved" : "rejected",
        identity_ai_summary: approved
          ? "Aprobación manual de administración: fecha del carnet y comparación visual de biometría corroboradas."
          : body.reason?.trim() ?? null,
        identity_ai_at: now,
        updated_at: now,
      })
      .eq("id", profileId)
      .eq("identity_status", "pending")
      .select("id");
    if (error) throw error;
    if (!updatedProfiles?.length) {
      return NextResponse.json(
        { error: "Esta identidad ya fue aprobada, rechazada o no está pendiente de revisión." },
        { status: 409 },
      );
    }

    const { error: documentsError } = await admin
      .from("identity_documents")
      .update({
        status: approved ? "approved" : "rejected",
        reviewed_by: actor.userId,
        reviewed_at: now,
        admin_notes: approved
          ? "Aprobado en revisión manual; carnet, selfie y prueba de vida corroborados visualmente."
          : body.reason?.trim() ?? null,
        updated_at: now,
      })
      .eq("profile_id", profileId);
    if (documentsError) throw documentsError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo completar la revisión." },
      { status: 500 },
    );
  }
}
