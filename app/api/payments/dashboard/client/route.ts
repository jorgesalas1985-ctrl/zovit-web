import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/security/validation";
import { mapPaymentRow } from "@/lib/payments/mappers";
import type { PaymentEvent, PaymentStatus } from "@/lib/payments/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    if (!isValidUuid(authData.user.id)) {
      return NextResponse.json({ error: "Identificador de usuario inválido." }, { status: 400 });
    }

    // Lectura con service role: en prod faltan GRANT de tabla a authenticated.
    const admin = createAdminClient();
    const [paymentsResult, eventsResult, cancellationFeesResult] = await Promise.all([
      admin
        .from("payments")
        .select("*")
        .eq("client_id", authData.user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("payment_events")
        .select("id,payment_id,event_type,old_status,new_status,amount,platform_fee,tax_amount,payment_method,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      admin
        .from("cancellation_fees")
        .select("*")
        .eq("client_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    if (paymentsResult.error) {
      return NextResponse.json({ error: paymentsResult.error.message }, { status: 400 });
    }

    const payments = (paymentsResult.data ?? []).map((row) => mapPaymentRow(row as never));
    const pending = payments.filter((p) => ["pendiente", "esperando_pago"].includes(p.status));
    const completed = payments.filter((p) => p.status === "pago_liberado");
    const active = payments.filter((p) =>
      ["pago_retenido", "trabajo_en_ejecucion", "esperando_aprobacion_cliente"].includes(p.status),
    );

    const events: PaymentEvent[] = (eventsResult.data ?? [])
      .filter((event) => payments.some((payment) => payment.id === event.payment_id))
      .map((event) => ({
        id: event.id,
        paymentId: event.payment_id,
        eventType: event.event_type,
        oldStatus: event.old_status as PaymentStatus | null,
        newStatus: event.new_status as PaymentStatus | null,
        amount: event.amount != null ? Number(event.amount) : null,
        platformFee: event.platform_fee != null ? Number(event.platform_fee) : null,
        taxAmount: event.tax_amount != null ? Number(event.tax_amount) : null,
        paymentMethod: event.payment_method,
        createdAt: event.created_at,
      }));

    return NextResponse.json({
      pending,
      completed,
      active,
      payments,
      events,
      cancellationFees: cancellationFeesResult.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
