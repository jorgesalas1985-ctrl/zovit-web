import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { maskServiceAddress } from "@/lib/location/maskAddress";
import { NextResponse } from "next/server";

function clpAmount(text: string, label: string) {
  const match = text.match(new RegExp(`${label}\\s*:\\s*\\$([\\d.]+)`, "i"));
  return match ? Number(match[1].replace(/\D/g, "")) : 0;
}

export async function GET(request: Request) {
  try {
    const requestId = new URL(request.url).searchParams.get("requestId");
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const admin = createAdminClient();
    let serviceQuery = admin.from("solicitudes_de_servicio")
      .select("id,category,description,address,status,estimated_budget,professional_id")
      .eq("status", "publicada");
    if (requestId) {
      const { data: invitation } = await admin.from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("request_id", requestId)
        .eq("title", "Nuevo trabajo para ti")
        .maybeSingle();
      serviceQuery = serviceQuery.eq("id", requestId);
      if (!invitation) serviceQuery = serviceQuery.eq("professional_id", user.id);
    } else {
      serviceQuery = serviceQuery.eq("professional_id", user.id).order("created_at", { ascending: true }).limit(1);
    }
    const { data: service, error } = await serviceQuery.maybeSingle();
    if (error || !service || service.status !== "publicada") return NextResponse.json({ error: "Esta solicitud ya no está disponible." }, { status: 404 });

    const { data: pricing } = await admin.from("platform_work_pricing")
      .select("professional_day_net,fuel_base_fare")
      .eq("id", true)
      .maybeSingle();
    const requestedFuel = clpAmount(service.description ?? "", "Bencina solicitada");
    const automaticTransfer = clpAmount(service.description ?? "", "Traslado estimado por ZOVIT");
    const isFuelDelivery = requestedFuel > 0;
    // Solicitudes creadas antes del calculador no traen el traslado en su texto:
    // se muestra al menos la tarifa mínima configurada, nunca solo la bencina.
    const fuelDeliveryNet = isFuelDelivery
      ? requestedFuel + (automaticTransfer || Number(pricing?.fuel_base_fare ?? 4000))
      : 0;
    return NextResponse.json({
      request: {
        id: service.id,
        category: service.category,
        description: service.description,
        address: maskServiceAddress(service.address),
        // Para bencina se reembolsa el combustible solicitado más el traslado automático.
        // Aseo y los demás servicios conservan su tarifa diaria configurada.
        professionalNet: fuelDeliveryNet > 0 ? fuelDeliveryNet : Number(pricing?.professional_day_net ?? 30000),
        isFuelDelivery,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar la solicitud." }, { status: 500 });
  }
}
