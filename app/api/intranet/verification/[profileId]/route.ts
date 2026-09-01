import { NextResponse } from "next/server";
import { getIntranetReviewer } from "@/lib/intranet/apiAuth";
import { createClient } from "@/lib/supabase/server";
import { mapIdentityReviewRpcError } from "@/lib/verification/intranetIdentityReviewRpc";

export async function POST(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    if (!(await getIntranetReviewer())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });

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

    const supabase = await createClient();
    const { error } = await supabase.rpc("intranet_review_identity_verification", {
      p_profile_id: profileId, p_action: body.action, p_reason: body.reason ?? null,
      p_carnet_birth_matches: Boolean(body.carnetBirthDateMatches),
      p_biometric_face_matches: Boolean(body.biometricFaceMatches),
    });
    if (error) {
      const mapped = mapIdentityReviewRpcError(error.message);
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo completar la revisión." },
      { status: 500 },
    );
  }
}
