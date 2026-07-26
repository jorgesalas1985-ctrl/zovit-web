/**
 * Textos para boleta/factura y comprobante ZOVIT.
 * El servicio se documenta en ZOVIT; el financiamiento de cuotas lo cobra
 * la entidad financiera / emisor de la tarjeta (vía Mercado Pago).
 */

export const RECEIPT_SERVICE_ISSUER = "ZOVIT";

export const RECEIPT_FINANCING_ISSUER =
  "la entidad financiera emisora de tu tarjeta de crédito (a través de Mercado Pago)";

export const RECEIPT_FINANCING_NOTE =
  "El cargo por financiamiento o comisión de cuotas no forma parte del precio del servicio documentado por ZOVIT. Ese cobro lo realiza la entidad financiera de tu tarjeta de crédito / Mercado Pago según el plan de cuotas que elegiste. No constituye venta de ZOVIT ni del profesional.";

export const RECEIPT_SERVICE_NOTE =
  "La boleta o factura del servicio corresponde al monto del trabajo acordado en ZOVIT (precio del servicio). La comisión de la plataforma y los impuestos aplicables se desglosan conforme a la normativa vigente cuando se emita el documento tributario.";

export const RECEIPT_SII_PENDING_NOTE =
  "La emisión electrónica de boleta/factura ante el SII se implementará sobre este mismo desglose: monto de servicio en documento ZOVIT; financiamiento de cuotas solo como leyenda informativa (cobro de la entidad financiera), sin incorporarlo como ítem de venta de ZOVIT.";

export type ReceiptLine = {
  code: string;
  label: string;
  amount: number;
  taxableByZovit: boolean;
  note?: string;
};

export function buildClientReceiptLines(input: {
  serviceAmount: number;
  financingFee: number;
  installments: number | null;
}): ReceiptLine[] {
  const lines: ReceiptLine[] = [
    {
      code: "SERVICIO",
      label: "Servicio contratado en ZOVIT",
      amount: input.serviceAmount,
      taxableByZovit: true,
      note: RECEIPT_SERVICE_NOTE,
    },
  ];

  if (input.financingFee > 0) {
    lines.push({
      code: "FINANCIAMIENTO_TC",
      label: `Financiamiento cuotas tarjeta${
        input.installments && input.installments > 1 ? ` (${input.installments}×)` : ""
      } — cobrado por ${RECEIPT_FINANCING_ISSUER}`,
      amount: input.financingFee,
      taxableByZovit: false,
      note: RECEIPT_FINANCING_NOTE,
    });
  }

  return lines;
}
