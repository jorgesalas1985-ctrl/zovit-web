import { createClient } from "@/lib/supabase/server";
import { mapPaymentRow } from "@/lib/payments/mappers";
import type { WalletSummary } from "@/lib/payments/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const [walletResult, paymentsResult, txResult] = await Promise.all([
      supabase.rpc("get_wallet_summary", { p_user_id: authData.user.id }),
      supabase
        .from("payments")
        .select("*")
        .eq("professional_id", authData.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const walletRow = Array.isArray(walletResult.data) ? walletResult.data[0] : walletResult.data;
    const summary: WalletSummary = {
      availableBalance: Number(walletRow?.available_balance ?? 0),
      heldBalance: Number(walletRow?.held_balance ?? 0),
      currency: walletRow?.currency ?? "CLP",
      totalReceived: Number(walletRow?.total_received ?? 0),
      totalFees: Number(walletRow?.total_fees ?? 0),
    };

    const payments = (paymentsResult.data ?? []).map((row) => mapPaymentRow(row as never));
    const upcoming = payments.filter((p) =>
      ["pago_retenido", "trabajo_en_ejecucion", "esperando_aprobacion_cliente"].includes(p.status),
    );
    const received = payments.filter((p) => p.status === "pago_liberado");

    return NextResponse.json({
      summary,
      payments,
      upcoming,
      received,
      transactions: txResult.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
