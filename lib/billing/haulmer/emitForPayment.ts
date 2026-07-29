import { buildHaulmerDtePayload } from "@/lib/billing/haulmer/buildDte";
import { getHaulmerConfig, haulmerIsConfigured } from "@/lib/billing/haulmer/config";
import { HaulmerApiError, haulmerEmitDocument } from "@/lib/billing/haulmer/client";
import {
  HAULMER_DTE_TYPES,
  type HaulmerDteScope,
  type HaulmerDteType,
  type TaxDocumentRecord,
} from "@/lib/billing/haulmer/types";
import { createAdminClient } from "@/lib/supabase/admin";

const PAID_STATUSES = new Set([
  "pago_recibido",
  "pago_retenido",
  "trabajo_en_ejecucion",
  "trabajo_finalizado",
  "esperando_aprobacion_cliente",
  "pago_liberado",
]);

export type EmitDteForPaymentInput = {
  paymentId: string;
  actorId: string | null;
  dteType?: HaulmerDteType;
  scope?: HaulmerDteScope;
  force?: boolean;
};

function mapTaxDocument(row: Record<string, unknown>): TaxDocumentRecord {
  return {
    id: String(row.id),
    paymentId: String(row.payment_id),
    provider: "haulmer",
    dteType: Number(row.dte_type) as HaulmerDteType,
    scope: row.scope as HaulmerDteScope,
    status: row.status as TaxDocumentRecord["status"],
    folio: row.folio != null ? String(row.folio) : null,
    token: row.provider_token != null ? String(row.provider_token) : null,
    amountNet: Number(row.amount_net),
    amountTax: Number(row.amount_tax),
    amountTotal: Number(row.amount_total),
    receptorRut: String(row.receptor_rut),
    receptorName: String(row.receptor_name),
    financingNote: row.financing_note != null ? String(row.financing_note) : null,
    pdfBase64: row.pdf_base64 != null ? String(row.pdf_base64) : null,
    errorMessage: row.error_message != null ? String(row.error_message) : null,
    issuedAt: row.issued_at != null ? String(row.issued_at) : null,
    createdAt: String(row.created_at),
  };
}

export async function listTaxDocumentsForPayment(
  paymentId: string,
): Promise<TaxDocumentRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tax_documents")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("tax_documents") || error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapTaxDocument(row as Record<string, unknown>));
}

export async function emitDteForPayment(
  input: EmitDteForPaymentInput,
): Promise<{ document: TaxDocumentRecord; alreadyIssued: boolean }> {
  const config = getHaulmerConfig();
  if (!haulmerIsConfigured()) {
    throw new Error("Haulmer/OpenFactura no está configurado (HAULMER_API_KEY).");
  }

  const dteType = input.dteType ?? HAULMER_DTE_TYPES.boletaAfecta;
  const scope = input.scope ?? "service";
  const admin = createAdminClient();

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select(
      "id,public_id,status,amount_gross,platform_fee,tax_amount,provider_financing_fee,installment_count,client_id",
    )
    .eq("id", input.paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    throw new Error(paymentError?.message ?? "Pago no encontrado.");
  }

  if (!PAID_STATUSES.has(String(payment.status))) {
    throw new Error("Solo se emite DTE cuando el pago ya fue recibido o retenido.");
  }

  const { data: existing } = await admin
    .from("tax_documents")
    .select("*")
    .eq("payment_id", payment.id)
    .eq("dte_type", dteType)
    .eq("scope", scope)
    .eq("status", "issued")
    .maybeSingle();

  if (existing && !input.force) {
    return { document: mapTaxDocument(existing as Record<string, unknown>), alreadyIssued: true };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name,rut")
    .eq("id", payment.client_id)
    .maybeSingle();

  const built = buildHaulmerDtePayload({
    dteType,
    scope,
    serviceAmount: Number(payment.amount_gross),
    platformFee: Number(payment.platform_fee),
    platformFeeTax: Number(payment.tax_amount),
    financingFee: Number(payment.provider_financing_fee ?? 0),
    installments: payment.installment_count != null ? Number(payment.installment_count) : null,
    paymentPublicId: String(payment.public_id),
    receptorRut: profile?.rut ?? null,
    receptorName: profile?.full_name ?? null,
  });

  const idempotencyKey = `zovit-${payment.public_id}-${dteType}-${scope}`;

  const { data: pendingRow, error: insertError } = await admin
    .from("tax_documents")
    .insert({
      payment_id: payment.id,
      provider: "haulmer",
      dte_type: dteType,
      scope,
      status: "pending",
      amount_net: built.amountNet,
      amount_tax: built.amountTax,
      amount_total: built.amountTotal,
      receptor_rut: built.receptorRut,
      receptor_name: built.receptorName,
      financing_note: built.financingNote,
      request_payload: built.payload,
      created_by: input.actorId,
      environment: config.environment,
    })
    .select("*")
    .single();

  if (insertError || !pendingRow) {
    throw new Error(
      insertError?.message ??
        "No se pudo registrar el documento tributario. ¿Ejecutaste SPRINT_18_HAULMER_DTE.sql?",
    );
  }

  try {
    // En sandbox Haulmer la API key pública espera emisor Haulmer; en prod usamos Impresiones Getsemaní.
    const payloadForEnv =
      config.environment === "development" &&
      config.apiKey &&
      !process.env.HAULMER_API_KEY
        ? rewriteEmitterForPublicSandbox(built.payload)
        : built.payload;

    const response = await haulmerEmitDocument({
      payload: payloadForEnv,
      idempotencyKey,
    });

    const { data: issued, error: updateError } = await admin
      .from("tax_documents")
      .update({
        status: "issued",
        folio: response.FOLIO != null ? String(response.FOLIO) : null,
        provider_token: response.TOKEN ?? null,
        pdf_base64: response.PDF ?? null,
        xml_content: response.XML ?? null,
        timbre_base64: response.TIMBRE ?? null,
        provider_response: {
          folio: response.FOLIO,
          token: response.TOKEN,
          warnings: response.WARNING ?? [],
        },
        error_message: null,
        issued_at: new Date().toISOString(),
      })
      .eq("id", pendingRow.id)
      .select("*")
      .single();

    if (updateError || !issued) {
      throw new Error(updateError?.message ?? "DTE emitido pero no se pudo guardar.");
    }

    return { document: mapTaxDocument(issued as Record<string, unknown>), alreadyIssued: false };
  } catch (error) {
    const message =
      error instanceof HaulmerApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Error al emitir DTE";

    await admin
      .from("tax_documents")
      .update({
        status: "failed",
        error_message: message.slice(0, 2000),
      })
      .eq("id", pendingRow.id);

    throw error instanceof Error ? error : new Error(message);
  }
}

/** Solo para pruebas con la API key pública de OpenFactura (emisor Haulmer). */
function rewriteEmitterForPublicSandbox(payload: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(payload) as {
    dte?: {
      Encabezado?: {
        Emisor?: Record<string, unknown>;
      };
    };
  };
  const emisor = clone.dte?.Encabezado?.Emisor;
  if (!emisor) return payload;

  if ("RznSocEmisor" in emisor) {
    emisor.RUTEmisor = "76795561-8";
    emisor.RznSocEmisor = "HAULMER SPA";
    emisor.GiroEmisor = "VENTA AL POR MENOR";
    emisor.DirOrigen = "ARTURO PRAT 527";
    emisor.CmnaOrigen = "Curico";
  } else {
    emisor.RUTEmisor = "76795561-8";
    emisor.RznSoc = "HAULMER SPA";
    emisor.GiroEmis = "VENTA AL POR MENOR EN EMPRESAS DE VENTA A DISTANCIA VIA INTERNET";
    emisor.DirOrigen = "ARTURO PRAT 527";
    emisor.CmnaOrigen = "Curico";
  }

  return clone as Record<string, unknown>;
}

/**
 * Emisión automática post-pago (no bloquea el cobro si falla).
 */
export async function maybeAutoEmitDteAfterPayment(paymentId: string): Promise<void> {
  const config = getHaulmerConfig();
  if (!config.enabled || !config.autoEmit || !haulmerIsConfigured()) return;

  try {
    await emitDteForPayment({
      paymentId,
      actorId: null,
      dteType: HAULMER_DTE_TYPES.boletaAfecta,
      scope: "service",
    });
  } catch (error) {
    console.error("[haulmer] auto-emit failed", paymentId, error);
  }
}
