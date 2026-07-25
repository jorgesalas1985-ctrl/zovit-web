import { confirmPaymentReceived } from "@/lib/payments/confirmPayment";
import { getPaymentProvider, isMockPaymentsAllowed } from "@/lib/payments/providers";
import { validateMercadoPagoPublicUrl } from "@/lib/payments/providers/mercadopago";
import { mapPaymentRow } from "@/lib/payments/mappers";
import type { PaymentProviderName } from "@/lib/payments/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { provider?: PaymentProviderName };
    const providerName = body.provider ?? "mock";

    if (providerName === "mock" && !isMockPaymentsAllowed()) {
      return NextResponse.json(
        { error: "El pago de prueba no está habilitado. Usa Mercado Pago o activa ZOVIT_ALLOW_MOCK_PAYMENTS." },
        { status: 400 }
      );
    }

    if (providerName === "mercadopago") {
      const publicUrlError = validateMercadoPagoPublicUrl();
      if (publicUrlError) {
        return NextResponse.json({ error: publicUrlError }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    // Preferimos RPC/security definer porque en prod pueden faltar GRANT de tabla.
    const bodyExtra = body as {
      provider?: PaymentProviderName;
      publicId?: string;
      amountGross?: number;
      currency?: string;
      requestId?: string;
    };

    let payment = null as ReturnType<typeof mapPaymentRow> | null;
    try {
      const admin = createAdminClient();
      const { data: paymentRow } = await admin.from("payments").select("*").eq("id", id).maybeSingle();
      if (paymentRow) payment = mapPaymentRow(paymentRow as never);
    } catch {
      payment = null;
    }

    if (!payment && bodyExtra.publicId && bodyExtra.amountGross) {
      payment = {
        id,
        publicId: bodyExtra.publicId,
        clientId: authData.user.id,
        professionalId: "",
        requestId: bodyExtra.requestId ?? "",
        workOrderId: "",
        amountGross: Number(bodyExtra.amountGross),
        platformFee: 0,
        taxAmount: 0,
        amountNet: 0,
        currency: bodyExtra.currency ?? "CLP",
        status: "esperando_pago",
        provider: "mock",
        providerReference: null,
        providerSessionId: null,
        paymentMethod: null,
        paidAt: null,
        releasedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ReturnType<typeof mapPaymentRow>;
    }

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Pago no legible aún. Aplica supabase/FIX_PAYMENT_TABLE_GRANTS.sql en Supabase SQL Editor.",
        },
        { status: 404 },
      );
    }

    if (payment.clientId && payment.clientId !== authData.user.id) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    if (payment.status !== "esperando_pago") {
      return NextResponse.json({ error: "El pago no está pendiente." }, { status: 400 });
    }

    const provider = getPaymentProvider(providerName);
    const session = await provider.createSession({
      paymentId: payment.id,
      publicId: payment.publicId,
      amount: payment.amountGross,
      currency: payment.currency,
      clientEmail: authData.user.email ?? undefined,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pagos?payment=${payment.publicId}`,
      metadata: { requestId: payment.requestId },
    });

    if (providerName === "mock") {
      const { error: mockError } = await supabase.rpc("register_payment_received", {
        p_payment_id: payment.id,
        p_provider: providerName,
        p_provider_reference: session.reference,
        p_provider_session_id: session.sessionId,
        p_payment_method: providerName,
        p_external_reference: payment.publicId,
        p_amount_gross: Number(payment.amountGross),
      });
      if (mockError) {
        // Fallback service-role RPC si authenticated no puede.
        try {
          await confirmPaymentReceived({
            paymentId: payment.id,
            provider: providerName,
            providerReference: session.reference,
            providerSessionId: session.sessionId,
            paymentMethod: providerName,
            externalReference: payment.publicId,
            amountGross: payment.amountGross,
            currency: payment.currency,
          });
        } catch {
          return NextResponse.json({ error: mockError.message }, { status: 400 });
        }
      }

      return NextResponse.json({
        session,
        paymentPublicId: payment.publicId,
        status: "pago_retenido",
      });
    }

    return NextResponse.json({
      session,
      paymentPublicId: payment.publicId,
      status: "esperando_pago",
      message: "Redirigiendo a Mercado Pago…",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
