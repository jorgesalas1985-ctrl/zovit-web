import { NextResponse } from "next/server";
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

/** Marca un documento revisado manualmente sin aprobar todavía toda la identidad. */
export async function POST(
  request: Request,
  context: { params: Promise<{ profileId: string; documentId: string }> },
) {
  try {
    const actor = await authorize();
    if (!actor) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });

    const { profileId, documentId } = await context.params;
    const body = await request.json() as { checked?: boolean; biometricFaceConfirmed?: boolean };
    if (typeof body.biometricFaceConfirmed === "boolean") {
      const { data: document, error: documentError } = await actor.supabase
        .from("identity_documents")
        .select("document_type,metadata")
        .eq("id", documentId)
        .eq("profile_id", profileId)
        .maybeSingle();
      if (documentError) throw documentError;
      if (!document || document.document_type !== "selfie") {
        return NextResponse.json({ error: "La confirmación biométrica solo corresponde a la selfie." }, { status: 400 });
      }

      const metadata = (document.metadata && typeof document.metadata === "object")
        ? document.metadata as Record<string, unknown>
        : {};
      const { error } = await actor.supabase
        .from("identity_documents")
        .update({
          metadata: { ...metadata, manualFaceMatchConfirmed: body.biometricFaceConfirmed },
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("profile_id", profileId);
      if (error) throw error;
      return NextResponse.json({ ok: true, biometricFaceConfirmed: body.biometricFaceConfirmed });
    }

    if (typeof body.checked !== "boolean") {
      return NextResponse.json({ error: "Estado de casilla inválido." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await actor.supabase
      .from("identity_documents")
      .update({
        status: body.checked ? "approved" : "uploaded",
        reviewed_by: body.checked ? actor.userId : null,
        reviewed_at: body.checked ? now : null,
        admin_notes: body.checked ? "Documento revisado manualmente." : null,
        updated_at: now,
      })
      .eq("id", documentId)
      .eq("profile_id", profileId);
    if (error) throw error;

    return NextResponse.json({ ok: true, checked: body.checked });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la revisión del documento." },
      { status: 500 },
    );
  }
}
