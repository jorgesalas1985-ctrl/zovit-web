import { buildClientReceiptLines, RECEIPT_FINANCING_NOTE, RECEIPT_SII_PENDING_NOTE } from "@/lib/payments/receiptCopy";
import { mapPaymentRow } from "@/lib/payments/mappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: row, error } = await admin.from("payments").select("*").eq("id", id).maybeSingle();
    if (error || !row) {
      return NextResponse.json({ error: error?.message ?? "Pago no encontrado." }, { status: 404 });
    }

    const payment = mapPaymentRow(row as never);
    const isOwner =
      payment.clientId === authData.user.id || payment.professionalId === authData.user.id;
    if (!isOwner) {
      const { data: profile } = await admin
        .from("profiles")
        .select("intranet_role")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (profile?.intranet_role !== "super_admin") {
        return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
      }
    }

    const financingFee = payment.providerFinancingFee;
    const lines = buildClientReceiptLines({
      serviceAmount: payment.amountGross,
      financingFee,
      installments: payment.installmentCount,
    });

    return NextResponse.json({
      payment,
      lines,
      totals: {
        serviceAmount: payment.amountGross,
        financingFee,
        clientTotal: payment.clientChargedAmount ?? payment.amountGross + financingFee,
        professionalNet: payment.amountNet,
        zovitFee: payment.platformFee,
        zovitFeeTax: payment.taxAmount,
      },
      legal: {
        financingNote: RECEIPT_FINANCING_NOTE,
        siiNote: RECEIPT_SII_PENDING_NOTE,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
