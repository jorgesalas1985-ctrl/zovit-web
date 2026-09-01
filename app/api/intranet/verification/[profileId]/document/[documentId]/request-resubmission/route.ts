import { NextResponse } from "next/server";
import { getIntranetReviewer } from "@/lib/intranet/apiAuth";
import { createClient } from "@/lib/supabase/server";
import { mapIdentityResubmissionRpcError } from "@/lib/verification/intranetIdentityResubmissionRpc";

/** Devuelve una identidad al usuario para que reemplace solo el documento observado. */
export async function POST(request: Request, context: { params: Promise<{ profileId: string; documentId: string }> }) {
  try {
    if (!(await getIntranetReviewer())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const { profileId, documentId } = await context.params;
    const { reason } = await request.json().catch(() => ({})) as { reason?: string };
    const supabase = await createClient();
    const { data: documentLabel, error } = await supabase.rpc("intranet_request_identity_resubmission", {
      p_profile_id: profileId,
      p_document_ids: [documentId],
      p_reason: reason ?? null,
    });
    if (error) {
      const mapped = mapIdentityResubmissionRpcError(error.message, "single");
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, message: `Se solicitó el reenvío de ${documentLabel}.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo solicitar el reenvío." }, { status: 500 });
  }
}
