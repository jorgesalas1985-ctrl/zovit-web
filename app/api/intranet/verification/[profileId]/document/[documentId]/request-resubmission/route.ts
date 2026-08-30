import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IDENTITY_DOCUMENT_LABELS, type IdentityDocumentType } from "@/lib/verification/types";

async function authorize() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
  if (profile?.intranet_role !== "hr_admin" && profile?.intranet_role !== "super_admin") return null;
  return data.user;
}

/** Devuelve una identidad al usuario para que reemplace solo el documento observado. */
export async function POST(request: Request, context: { params: Promise<{ profileId: string; documentId: string }> }) {
  try {
    const actor = await authorize();
    if (!actor) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const { profileId, documentId } = await context.params;
    const { reason } = await request.json().catch(() => ({})) as { reason?: string };
    const explanation = reason?.trim() || "El archivo no se ve con suficiente nitidez para validarlo.";
    const admin = createAdminClient();
    const { data: document, error: documentError } = await admin
      .from("identity_documents")
      .select("document_type")
      .eq("id", documentId)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (documentError || !document) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });

    const documentType = document.document_type as IdentityDocumentType;
    const documentLabel = IDENTITY_DOCUMENT_LABELS[documentType] ?? "documento de identidad";
    const now = new Date().toISOString();
    const requestMessage = `Debes reenviar ${documentLabel}. Motivo: ${explanation}`;

    const { error: updateDocumentError } = await admin
      .from("identity_documents")
      .update({ status: "rejected", reviewed_by: actor.id, reviewed_at: now, admin_notes: requestMessage, updated_at: now })
      .eq("id", documentId)
      .eq("profile_id", profileId);
    if (updateDocumentError) throw updateDocumentError;

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        identity_status: "rejected",
        identity_verified: false,
        biometric_verified: false,
        identity_verified_at: null,
        identity_rejection_reason: requestMessage,
        identity_ai_status: "pending",
        identity_ai_summary: "Pendiente de reenvío de un documento solicitado por revisión humana.",
        updated_at: now,
      })
      .eq("id", profileId)
      .eq("identity_status", "pending");
    if (profileError) throw profileError;

    const { error: notificationError } = await admin.from("notifications").insert({
      user_id: profileId,
      title: "Debes reenviar un documento",
      body: `${requestMessage} Ingresa a Panel → Verificación para reemplazarlo y enviar nuevamente tu revisión.`,
    });
    if (notificationError) throw notificationError;

    return NextResponse.json({ ok: true, message: `Se solicitó el reenvío de ${documentLabel}.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo solicitar el reenvío." }, { status: 500 });
  }
}
