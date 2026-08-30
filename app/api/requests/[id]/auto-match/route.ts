import { inviteProfessionalsForRequest } from "@/lib/automation/inviteProfessionals";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(request);
  if (!csrf.ok) return csrfDeniedResponse(csrf.error);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const { data: service } = await supabase.from("solicitudes_de_servicio")
    .select("client_id,status")
    .eq("id", id)
    .maybeSingle();
  if (!service || service.client_id !== user.id || service.status !== "publicada") {
    return NextResponse.json({ error: "No puedes distribuir esta solicitud." }, { status: 403 });
  }
  const result = await inviteProfessionalsForRequest(id);
  return NextResponse.json(result);
}
