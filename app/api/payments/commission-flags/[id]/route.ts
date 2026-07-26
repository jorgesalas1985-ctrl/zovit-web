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
    const body = (await request.json()) as { status?: string; note?: string };
    const status = body.status?.trim();
    if (!status || !["revisada", "descartada", "sancionada"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("resolve_commission_risk_flag", {
      p_flag_id: id,
      p_status: status,
      p_note: body.note ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
