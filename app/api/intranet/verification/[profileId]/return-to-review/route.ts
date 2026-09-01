import { NextResponse } from "next/server";
import { getIntranetReviewer } from "@/lib/intranet/apiAuth";
import { createClient } from "@/lib/supabase/server";

/** Devuelve una identidad aprobada a la cola para una revisión manual completa. */
export async function POST(_request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    if (!(await getIntranetReviewer())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });

    const { profileId } = await context.params;
    const supabase = await createClient();
    const { error } = await supabase.rpc("intranet_return_identity_to_review", { p_profile_id: profileId });
    if (error) {
      if (error.message === "Acceso no autorizado") return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
      if (error.message === "La identidad ya no está aprobada") return NextResponse.json({ error: "La identidad ya no está aprobada." }, { status: 409 });
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo devolver la identidad a revisión." },
      { status: 500 },
    );
  }
}
