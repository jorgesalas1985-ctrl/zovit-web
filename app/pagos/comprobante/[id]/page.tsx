"use client";

import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import type { PaymentRecord } from "@/lib/payments/types";
import { formatCLP, PAYMENT_STATUS_LABELS } from "@/lib/payments/types";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ReceiptLine = {
  code: string;
  label: string;
  amount: number;
  taxableByZovit: boolean;
  note?: string;
};

type ReceiptPayload = {
  payment: PaymentRecord;
  lines: ReceiptLine[];
  totals: {
    serviceAmount: number;
    financingFee: number;
    clientTotal: number;
    professionalNet: number;
    zovitFee: number;
    zovitFeeTax: number;
  };
  legal: {
    financingNote: string;
    siiNote: string;
  };
};

export default function PaymentReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReceiptPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      const response = await fetch(`/api/payments/orders/${id}/receipt`);
      const payload = await response.json();
      setLoading(false);
      if (!response.ok) {
        setError(payload.error ?? "No se pudo cargar el comprobante.");
        return;
      }
      setData(payload as ReceiptPayload);
    })();
  }, [id]);

  return (
    <Protected>
      <RoleGuard requiredMode="client">
        <main className="simplePage">
          <section className="formPageCard paymentsPage">
            <Link href="/pagos" className="backLink">
              <ArrowLeft size={18} /> Volver a pagos
            </Link>
            <div className="eyebrow">
              <FileText size={16} /> Comprobante
            </div>
            <h1>Boleta / factura del pago</h1>
            <p className="muted">
              El documento del servicio corresponde a ZOVIT. Si pagaste en cuotas, el financiamiento
              lo cobra la entidad financiera de tu tarjeta de crédito.
            </p>

            {loading && <p className="muted">Cargando comprobante…</p>}
            {error && <p className="aiError">{error}</p>}

            {data && (
              <>
                <dl className="requestMeta">
                  <div>
                    <dt>ID pago</dt>
                    <dd>{data.payment.publicId}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{PAYMENT_STATUS_LABELS[data.payment.status]}</dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd>
                      {data.payment.paidAt
                        ? new Date(data.payment.paidAt).toLocaleString("es-CL")
                        : new Date(data.payment.createdAt).toLocaleString("es-CL")}
                    </dd>
                  </div>
                  <div>
                    <dt>Cuotas</dt>
                    <dd>
                      {data.payment.installmentCount && data.payment.installmentCount > 1
                        ? `${data.payment.installmentCount}× crédito`
                        : "Contado / débito"}
                    </dd>
                  </div>
                </dl>

                <section className="paymentsSection">
                  <h2>Desglose</h2>
                  {data.lines.map((line) => (
                    <article className="paymentHistoryItem" key={line.code}>
                      <strong>
                        {line.label}: {formatCLP(line.amount)}
                      </strong>
                      <p className="muted">
                        {line.taxableByZovit
                          ? "Incluido en boleta/factura del servicio ZOVIT."
                          : "No es ítem de venta ZOVIT: lo cobra la entidad financiera / tarjeta."}
                      </p>
                      {line.note && <p className="muted">{line.note}</p>}
                    </article>
                  ))}
                </section>

                <section className="paymentsSection">
                  <h2>Totales</h2>
                  <dl className="requestMeta">
                    <div>
                      <dt>Servicio (documento ZOVIT)</dt>
                      <dd>{formatCLP(data.totals.serviceAmount)}</dd>
                    </div>
                    {data.totals.financingFee > 0 && (
                      <div>
                        <dt>Financiamiento tarjeta (entidad financiera)</dt>
                        <dd>{formatCLP(data.totals.financingFee)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Total pagado por el cliente</dt>
                      <dd>{formatCLP(data.totals.clientTotal)}</dd>
                    </div>
                    <div>
                      <dt>Neto profesional</dt>
                      <dd>{formatCLP(data.totals.professionalNet)}</dd>
                    </div>
                  </dl>
                </section>

                <p className="muted">{data.legal.financingNote}</p>
                <p className="muted">{data.legal.siiNote}</p>
              </>
            )}
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
