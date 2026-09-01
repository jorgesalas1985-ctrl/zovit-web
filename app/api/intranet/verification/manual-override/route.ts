import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/security/validation";
import { mapManualOverrideRpcError } from "@/lib/verification/intranetManualOverrideRpc";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    const body = await request.json() as { profileId?: string; confirmation?: string };
    const profileId = String(body.profileId ?? "");
    if (!isValidUuid(profileId)) return NextResponse.json({ error: "Cuenta no válida." }, { status: 400 });
    if (body.confirmation !== "APROBAR SIN VERIFICACION") {
      return NextResponse.json({ error: "Confirmación de seguridad incorrecta." }, { status: 400 });
    }

    const { error } = await supabase.rpc("intranet_manual_override_identity_verification", {
      p_profile_id: profileId,
      p_confirmation: body.confirmation,
    });
    if (error) {
      const mapped = mapManualOverrideRpcError(error.message);
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo aprobar la cuenta." }, { status: 500 });
  }
}
