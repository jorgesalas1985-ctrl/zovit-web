import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: "aprobar" | "pagar" | "rechazar";
      note?: string;
    };

    if (!body.action || !["aprobar", "pagar", "rechazar"].includes(body.action)) {
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("process_payout", {
      p_payout_id: id,
      p_action: body.action,
      p_admin_note: body.note ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, action: body.action });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
