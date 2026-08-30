import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const PENDING_STATUSES = ["publicada", "aceptada", "en_camino", "en_ejecucion"];

export async function GET() {
  try {
    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { data, error } = await createAdminClient().from("solicitudes_de_servicio")
      .select("id,category,description,address,status,created_at,client_id,professional_id")
      .in("status", PENDING_STATUSES)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ requests: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar las solicitudes." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json() as { id?: string; action?: "cancel" | "delete" };
    if (!body.id || !body.action) return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    const admin = createAdminClient();
    const { data: service, error: serviceError } = await admin.from("solicitudes_de_servicio")
      .select("id,status,professional_id")
      .eq("id", body.id)
      .maybeSingle();
    if (serviceError || !service) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

    if (body.action === "cancel") {
      if (!PENDING_STATUSES.includes(service.status)) return NextResponse.json({ error: "La solicitud ya no se puede cancelar." }, { status: 400 });
      const { error } = await admin.from("solicitudes_de_servicio")
        .update({ status: "cancelada", updated_at: new Date().toISOString() })
        .eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (service.status !== "publicada" || service.professional_id) {
      return NextResponse.json({ error: "Solo se eliminan solicitudes publicadas sin profesional. Usa Cancelar para conservar el historial." }, { status: 400 });
    }
    const { count, error: paymentError } = await admin.from("payments").select("id", { count: "exact", head: true }).eq("request_id", body.id);
    if (paymentError) throw paymentError;
    if ((count ?? 0) > 0) return NextResponse.json({ error: "La solicitud tiene pagos asociados y no puede eliminarse; cancélala." }, { status: 400 });
    const { error } = await admin.from("solicitudes_de_servicio").delete().eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible actualizar la solicitud." }, { status: 500 });
  }
}
