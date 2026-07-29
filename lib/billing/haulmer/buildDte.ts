import { RECEIPT_FINANCING_NOTE } from "@/lib/payments/receiptCopy";
import { getHaulmerConfig } from "@/lib/billing/haulmer/config";
import {
  BOLETA_GENERIC_RECEPTOR_RUT,
  formatRutForHaulmer,
  isValidChileanRut,
} from "@/lib/billing/haulmer/rut";
import {
  HAULMER_DTE_TYPES,
  type HaulmerDteScope,
  type HaulmerDteType,
} from "@/lib/billing/haulmer/types";

export type BuildDteInput = {
  dteType: HaulmerDteType;
  scope: HaulmerDteScope;
  /** Monto bruto del servicio (CLP). */
  serviceAmount: number;
  /** Comisión neta ZOVIT (sin IVA). */
  platformFee: number;
  /** IVA de la comisión ZOVIT. */
  platformFeeTax: number;
  financingFee: number;
  installments: number | null;
  paymentPublicId: string;
  receptorRut: string | null;
  receptorName: string | null;
  emissionDate?: string;
};

export type BuiltDte = {
  payload: Record<string, unknown>;
  amountNet: number;
  amountTax: number;
  amountTotal: number;
  receptorRut: string;
  receptorName: string;
  financingNote: string | null;
  itemLabel: string;
};

/** En boleta Haulmer los ítems van en monto bruto (IVA incluido). */
export function splitIvaFromGross(gross: number): {
  mntNeto: number;
  iva: number;
  mntTotal: number;
} {
  const mntTotal = Math.round(gross);
  const mntNeto = Math.round(mntTotal / 1.19);
  const iva = mntTotal - mntNeto;
  return { mntNeto, iva, mntTotal };
}

function todayChile(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function resolveReceptor(input: BuildDteInput, dteType: HaulmerDteType) {
  const name = (input.receptorName?.trim() || "Cliente ZOVIT").slice(0, 100);
  if (input.receptorRut && isValidChileanRut(input.receptorRut)) {
    return { rut: formatRutForHaulmer(input.receptorRut), name };
  }
  if (dteType === HAULMER_DTE_TYPES.facturaAfecta) {
    throw new Error("La factura electrónica requiere RUT válido del receptor.");
  }
  return { rut: BOLETA_GENERIC_RECEPTOR_RUT, name };
}

function resolveAmounts(input: BuildDteInput): {
  bruto: number;
  itemLabel: string;
  itemDesc: string;
} {
  const financingNote =
    input.financingFee > 0
      ? ` Financiamiento cuotas (${input.installments && input.installments > 1 ? `${input.installments}x` : "TC"} ${input.financingFee} CLP) no es ítem de venta: lo cobra la entidad financiera.`
      : "";

  if (input.scope === "commission") {
    const bruto = Math.round(input.platformFee + input.platformFeeTax);
    if (bruto <= 0) {
      throw new Error("No hay comisión ZOVIT para documentar.");
    }
    return {
      bruto,
      itemLabel: "Comision plataforma ZOVIT",
      itemDesc: `Comision ZOVIT sobre pago ${input.paymentPublicId}.${financingNote}`.trim(),
    };
  }

  const bruto = Math.round(input.serviceAmount);
  if (bruto <= 0) {
    throw new Error("El monto del servicio debe ser mayor a 0.");
  }
  return {
    bruto,
    itemLabel: "Servicio contratado en ZOVIT",
    itemDesc: `Servicio pago ${input.paymentPublicId}.${financingNote}`.trim(),
  };
}

export function buildHaulmerDtePayload(input: BuildDteInput): BuiltDte {
  const config = getHaulmerConfig();
  const fchEmis = input.emissionDate ?? todayChile();
  const receptor = resolveReceptor(input, input.dteType);
  const { bruto, itemLabel, itemDesc } = resolveAmounts(input);
  const financingNote = input.financingFee > 0 ? RECEIPT_FINANCING_NOTE : null;

  if (input.dteType === HAULMER_DTE_TYPES.boletaAfecta) {
    const totals = splitIvaFromGross(bruto);
    return {
      amountNet: totals.mntNeto,
      amountTax: totals.iva,
      amountTotal: totals.mntTotal,
      receptorRut: receptor.rut,
      receptorName: receptor.name,
      financingNote,
      itemLabel,
      payload: {
        response: ["XML", "PDF", "TIMBRE", "FOLIO"],
        dte: {
          Encabezado: {
            IdDoc: {
              TipoDTE: HAULMER_DTE_TYPES.boletaAfecta,
              Folio: 0,
              FchEmis: fchEmis,
              IndServicio: 3,
            },
            Emisor: {
              RUTEmisor: config.emitterRut,
              RznSocEmisor: config.emitterLegalName.slice(0, 100),
              GiroEmisor: config.giroEmisor.slice(0, 80),
              DirOrigen: config.emitterAddress.slice(0, 70),
              CmnaOrigen: config.emitterCommune.slice(0, 20),
            },
            Receptor: {
              RUTRecep: receptor.rut,
              RznSocRecep: receptor.name,
              DirRecep: config.emitterAddress.slice(0, 70),
              CmnaRecep: config.emitterCommune.slice(0, 20),
            },
            Totales: {
              MntNeto: totals.mntNeto,
              IVA: totals.iva,
              MntTotal: totals.mntTotal,
            },
          },
          Detalle: [
            {
              NroLinDet: 1,
              NmbItem: itemLabel.slice(0, 80),
              DscItem: itemDesc.slice(0, 1000),
              QtyItem: 1,
              PrcItem: totals.mntTotal,
              MontoItem: totals.mntTotal,
            },
          ],
        },
      },
    };
  }

  // Factura afecta 33: ítems en neto + IVA.
  const amountNet =
    input.scope === "commission"
      ? Math.round(input.platformFee)
      : Math.round(bruto / 1.19);
  const amountTax =
    input.scope === "commission" ? Math.round(input.platformFeeTax) : bruto - amountNet;
  const amountTotal = amountNet + amountTax;

  if (!config.acteco || !config.cdgSiiSucur) {
    throw new Error(
      "Para factura (33) configura HAULMER_ACTECO y HAULMER_CDG_SII_SUCUR (datos de tu cuenta OpenFactura).",
    );
  }

  return {
    amountNet,
    amountTax,
    amountTotal,
    receptorRut: receptor.rut,
    receptorName: receptor.name,
    financingNote,
    itemLabel,
    payload: {
      response: ["XML", "PDF", "TIMBRE", "FOLIO", "RESOLUCION"],
      dte: {
        Encabezado: {
          IdDoc: {
            TipoDTE: HAULMER_DTE_TYPES.facturaAfecta,
            Folio: 0,
            FchEmis: fchEmis,
            TpoTranCompra: 1,
            TpoTranVenta: 1,
            FmaPago: 2,
          },
          Emisor: {
            RUTEmisor: config.emitterRut,
            RznSoc: config.emitterLegalName.slice(0, 100),
            GiroEmis: config.giroEmisor.slice(0, 80),
            Acteco: config.acteco,
            DirOrigen: config.emitterAddress.slice(0, 70),
            CmnaOrigen: config.emitterCommune.slice(0, 20),
            CdgSIISucur: config.cdgSiiSucur,
          },
          Receptor: {
            RUTRecep: receptor.rut,
            RznSocRecep: receptor.name,
            GiroRecep: "Particular o empresa",
            DirRecep: "Chile",
            CmnaRecep: config.emitterCommune.slice(0, 20),
          },
          Totales: {
            MntNeto: amountNet,
            TasaIVA: "19",
            IVA: amountTax,
            MntTotal: amountTotal,
          },
        },
        Detalle: [
          {
            NroLinDet: 1,
            NmbItem: itemLabel.slice(0, 80),
            DscItem: itemDesc.slice(0, 1000),
            QtyItem: 1,
            PrcItem: amountNet,
            MontoItem: amountNet,
          },
        ],
      },
    },
  };
}
