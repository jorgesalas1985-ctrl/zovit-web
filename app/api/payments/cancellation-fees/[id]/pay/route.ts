import { getPaymentProvider, isMockPaymentsAllowed } from "@/lib/payments/providers";
import { validateMercadoPagoPublicUrl } from "@/lib/payments/providers/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const { id } = await params;
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: fee, error } = await admin
      .from("cancellation_fees")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !fee) {
      return NextResponse.json({ error: error?.message ?? "Cargo no encontrado." }, { status: 404 });
    }
    if (fee.client_id !== authData.user.id) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    if (fee.status !== "pendiente" || Number(fee.amount) <= 0) {
      return NextResponse.json({ error: "Este cargo no está pendiente de pago." }, { status: 400 });
    }

    const providerName = isMockPaymentsAllowed() ? "mock" : "mercadopago";
    if (providerName === "mercadopago") {
      const publicUrlError = validateMercadoPagoPublicUrl();
      if (publicUrlError) {
        return NextResponse.json({ error: publicUrlError }, { status: 400 });
      }
    }

    if (providerName === "mock") {
      const { error: markError } = await admin.rpc("mark_cancellation_fee_paid", {
        p_fee_id: fee.id,
        p_provider: "mock",
        p_provider_reference: `mock-cfee-${fee.public_id}`,
        p_provider_session_id: null,
      });
      if (markError) {
        return NextResponse.json({ error: markError.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, status: "pagada", feePublicId: fee.public_id });
    }

    const provider = getPaymentProvider("mercadopago");
    const session = await provider.createSession({
      paymentId: fee.id,
      publicId: fee.public_id,
      amount: Number(fee.amount),
      currency: fee.currency ?? "CLP",
      clientEmail: authData.user.email ?? undefined,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pagos?cfee=${fee.public_id}`,
      metadata: { requestId: fee.request_id, kind: "cancellation_fee" },
    });

    await admin
      .from("cancellation_fees")
      .update({
        provider: "mercadopago",
        provider_session_id: session.sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fee.id);

    return NextResponse.json({
      ok: true,
      session,
      feePublicId: fee.public_id,
      redirectUrl: session.redirectUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
