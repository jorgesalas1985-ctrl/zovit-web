import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IDENTITY_DOCUMENT_LABELS, type IdentityDocumentType } from "@/lib/verification/types";

async function authorize() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
  return profile?.intranet_role === "hr_admin" || profile?.intranet_role === "super_admin" ? data.user : null;
}

/** Solicita en un único aviso el reemplazo de uno o más documentos observados. */
export async function POST(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    const actor = await authorize();
    if (!actor) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const { profileId } = await context.params;
    const { documentIds, reason } = await request.json().catch(() => ({})) as { documentIds?: unknown; reason?: string };
    if (!Array.isArray(documentIds) || !documentIds.length || !documentIds.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "Selecciona al menos un documento." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: documents, error: documentsError } = await admin
      .from("identity_documents")
      .select("id,document_type")
      .eq("profile_id", profileId)
      .in("id", documentIds);
    if (documentsError) throw documentsError;
    if (!documents?.length || documents.length !== documentIds.length) {
      return NextResponse.json({ error: "Uno o más documentos no pertenecen a esta identidad." }, { status: 400 });
    }

    const labels = documents.map((document) => IDENTITY_DOCUMENT_LABELS[document.document_type as IdentityDocumentType] ?? "documento");
    const explanation = reason?.trim() || "Los archivos no permiten validar la información con claridad.";
    const now = new Date().toISOString();
    const requestMessage = `Debes reenviar: ${labels.join(", ")}. Motivo: ${explanation}`;
    const { error: updateDocumentsError } = await admin
      .from("identity_documents")
      .update({ status: "rejected", reviewed_by: actor.id, reviewed_at: now, admin_notes: requestMessage, updated_at: now })
      .eq("profile_id", profileId)
      .in("id", documentIds);
    if (updateDocumentsError) throw updateDocumentsError;

    const { error: profileError } = await admin.from("profiles").update({
      identity_status: "rejected", identity_verified: false, biometric_verified: false, identity_verified_at: null,
      identity_rejection_reason: requestMessage, identity_resubmission_due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), identity_resubmission_suspended_at: null, identity_ai_status: "pending",
      identity_ai_summary: "Pendiente de reenvío documental solicitado por revisión humana.", updated_at: now,
    }).eq("id", profileId).eq("identity_status", "pending");
    if (profileError) throw profileError;

    const { error: notificationError } = await admin.from("notifications").insert({
      user_id: profileId,
      title: "Debes reenviar documentos",
      body: `${requestMessage} Ingresa a Panel → Verificación para reemplazarlos y enviar nuevamente tu revisión.`,
    });
    if (notificationError) throw notificationError;
    return NextResponse.json({ ok: true, message: `Se solicitó el reenvío de ${documents.length} documento(s).` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo solicitar el reenvío." }, { status: 500 });
  }
}
