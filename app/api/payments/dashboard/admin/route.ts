import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { mapPaymentRow } from "@/lib/payments/mappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // service_role solo tras verificar super_admin (RR.HH. no entra aquí).
    const admin = createAdminClient();
    const [
      paymentsResult,
      disputesResult,
      walletsResult,
      eventsResult,
      payoutsResult,
      commissionFlagsResult,
      cancellationFeesResult,
    ] = await Promise.all([
      admin.from("payments").select("*").order("created_at", { ascending: false }).limit(50),
      admin.from("payment_disputes").select("*").order("created_at", { ascending: false }).limit(40),
      admin.from("wallets").select("*").order("updated_at", { ascending: false }).limit(50),
      admin.from("payment_events").select("*").order("created_at", { ascending: false }).limit(40),
      admin.from("payout_requests").select("*").order("created_at", { ascending: false }).limit(50),
      admin
        .from("commission_risk_flags")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
      admin
        .from("cancellation_fees")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const payments = (paymentsResult.data ?? []).map((row) => mapPaymentRow(row as never));
    const commissionFlags = commissionFlagsResult.data ?? [];
    const stats = {
      totalVolume: payments.reduce((sum, p) => sum + p.amountGross, 0),
      totalFees: payments.reduce((sum, p) => sum + p.platformFee + p.taxAmount, 0),
      heldCount: payments.filter((p) =>
        ["pago_retenido", "trabajo_en_ejecucion", "esperando_aprobacion_cliente", "en_disputa"].includes(
          p.status,
        ),
      ).length,
      releasedCount: payments.filter((p) => p.status === "pago_liberado").length,
      disputedCount: payments.filter((p) => p.status === "en_disputa").length,
      pendingPayouts: (payoutsResult.data ?? []).filter((p) =>
        ["pendiente", "aprobado"].includes(p.status),
      ).length,
      openCommissionFlags: commissionFlags.filter((f) => f.status === "abierta").length,
      pendingCancellationFees: (cancellationFeesResult.data ?? []).filter(
        (f) => f.status === "pendiente",
      ).length,
    };

    return NextResponse.json({
      stats,
      payments,
      disputes: disputesResult.data ?? [],
      wallets: walletsResult.data ?? [],
      events: eventsResult.data ?? [],
      payouts: payoutsResult.data ?? [],
      commissionFlags,
      cancellationFees: cancellationFeesResult.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
