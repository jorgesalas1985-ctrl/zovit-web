import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Envía los documentos biométricos ya cargados a la cola de revisión. */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    }

    const { error } = await supabase.rpc("submit_identity_verification");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar la verificación biométrica." },
      { status: 500 },
    );
  }
}
