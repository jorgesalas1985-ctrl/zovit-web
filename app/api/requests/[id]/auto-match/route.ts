import { inviteProfessionalsForRequest } from "@/lib/automation/inviteProfessionals";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { isValidUuid } from "@/lib/security/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: row } = await admin
      .from("solicitudes_de_servicio")
      .select("id,client_id")
      .eq("id", id)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    if (row.client_id !== auth.user.id && auth.profile.role !== "admin") {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const result = await inviteProfessionalsForRequest(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
