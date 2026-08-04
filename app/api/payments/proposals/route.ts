import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/security/validation";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");
    if (!requestId) {
      return NextResponse.json({ error: "Falta requestId." }, { status: 400 });
    }
    if (!isValidUuid(requestId)) {
      return NextResponse.json({ error: "requestId inválido." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: requestRow, error: requestError } = await admin
      .from("solicitudes_de_servicio")
      .select("id,client_id,professional_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("role,can_act_as_professional,active_mode")
      .eq("id", authData.user.id)
      .maybeSingle();

    const isClient = requestRow.client_id === authData.user.id;
    const isAssignedPro = requestRow.professional_id === authData.user.id;
    const isAdmin = profile?.role === "admin";
    const canBrowseAsPro =
      profile?.can_act_as_professional ||
      profile?.role === "professional" ||
      profile?.role === "admin";

    if (!isClient && !isAssignedPro && !isAdmin && !canBrowseAsPro) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { data, error } = await admin
      .from("service_proposals")
      .select(
        "id,request_id,professional_id,amount,currency,description,estimated_hours,status,created_at",
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      proposals: (data ?? []).map((row) => ({
        id: row.id,
        requestId: row.request_id,
        professionalId: row.professional_id,
        amount: Number(row.amount),
        currency: row.currency,
        description: row.description,
        estimatedHours: row.estimated_hours != null ? Number(row.estimated_hours) : null,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId?: string;
      amount?: number;
      description?: string;
      estimatedHours?: number;
    };

    if (!body.requestId || body.amount == null || !body.description) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }
    if (!isValidUuid(body.requestId)) {
      return NextResponse.json({ error: "requestId inválido." }, { status: 400 });
    }
    if (Number(body.amount) <= 0 || Number(body.amount) > 1000000000) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_service_proposal", {
      p_request_id: body.requestId,
      p_amount: body.amount,
      p_description: body.description,
      p_estimated_hours: body.estimatedHours ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ proposalId: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
