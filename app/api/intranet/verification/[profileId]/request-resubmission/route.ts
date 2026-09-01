import { NextResponse } from "next/server";
import { getIntranetReviewer } from "@/lib/intranet/apiAuth";
import { createClient } from "@/lib/supabase/server";
import { mapIdentityResubmissionRpcError } from "@/lib/verification/intranetIdentityResubmissionRpc";

/** Solicita en un único aviso el reemplazo de uno o más documentos observados. */
export async function POST(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    if (!(await getIntranetReviewer())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const { profileId } = await context.params;
    const { documentIds, reason } = await request.json().catch(() => ({})) as { documentIds?: unknown; reason?: string };
    if (!Array.isArray(documentIds) || !documentIds.length || !documentIds.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "Selecciona al menos un documento." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("intranet_request_identity_resubmission", {
      p_profile_id: profileId,
      p_document_ids: documentIds,
      p_reason: reason ?? null,
    });
    if (error) {
      const mapped = mapIdentityResubmissionRpcError(error.message);
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, message: `Se solicitó el reenvío de ${documentIds.length} documento(s).` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo solicitar el reenvío." }, { status: 500 });
  }
}
