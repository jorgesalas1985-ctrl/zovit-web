import { createClient } from "@/lib/supabase/server";
import { mapPaymentRow } from "@/lib/payments/mappers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
    }

    const [paymentsResult, disputesResult, walletsResult, eventsResult] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("payment_disputes").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("wallets").select("*").order("updated_at", { ascending: false }).limit(20),
      supabase
        .from("payment_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const payments = (paymentsResult.data ?? []).map((row) => mapPaymentRow(row as never));
    const stats = {
      totalVolume: payments.reduce((sum, p) => sum + p.amountGross, 0),
      totalFees: payments.reduce((sum, p) => sum + p.platformFee + p.taxAmount, 0),
      heldCount: payments.filter((p) => p.status === "pago_retenido").length,
      releasedCount: payments.filter((p) => p.status === "pago_liberado").length,
      disputedCount: payments.filter((p) => p.status === "en_disputa").length,
    };

    return NextResponse.json({
      stats,
      payments,
      disputes: disputesResult.data ?? [],
      wallets: walletsResult.data ?? [],
      events: eventsResult.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
