import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import type { PaymentEvent, PaymentRecord } from "@/lib/payments/types";
import { formatCLP, PAYMENT_STATUS_LABELS, PROVIDER_LABELS } from "@/lib/payments/types";
import type { ReactNode } from "react";

type Props = {
  events: PaymentEvent[];
};

export function PaymentHistoryList({ events }: Props) {
  if (events.length === 0) {
    return <p className="muted">Sin movimientos registrados todavía.</p>;
  }

  return (
    <div className="paymentHistoryList">
      {events.map((event) => (
        <article className="paymentHistoryItem" key={event.id}>
          <div className="paymentHistoryTop">
            <strong>{event.eventType.replaceAll("_", " ")}</strong>
            {event.newStatus && <PaymentStatusBadge status={event.newStatus} />}
          </div>
          <div className="paymentHistoryMeta">
            {event.amount != null && <span>Monto: {formatCLP(event.amount)}</span>}
            {event.platformFee != null && event.platformFee > 0 && (
              <span>Comisión: {formatCLP(event.platformFee)}</span>
            )}
            {event.taxAmount != null && event.taxAmount > 0 && (
              <span>Impuesto: {formatCLP(event.taxAmount)}</span>
            )}
            {event.paymentMethod && <span>Medio: {event.paymentMethod}</span>}
          </div>
          <time>{new Date(event.createdAt).toLocaleString("es-CL")}</time>
        </article>
      ))}
    </div>
  );
}

type PaymentCardProps = {
  payment: PaymentRecord;
  actions?: ReactNode;
};

export function PaymentCard({ payment, actions }: PaymentCardProps) {
  return (
    <article className="paymentCard">
      <div className="paymentCardTop">
        <div>
          <p className="kicker">PAGO {payment.publicId}</p>
          <h3>{formatCLP(payment.amountGross)}</h3>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>
      <dl className="paymentCardMeta">
        <div><dt>Neto profesional</dt><dd>{formatCLP(payment.amountNet)}</dd></div>
        <div><dt>Comisión ZOVIT</dt><dd>{formatCLP(payment.platformFee)}</dd></div>
        <div><dt>Impuestos</dt><dd>{formatCLP(payment.taxAmount)}</dd></div>
        <div><dt>Proveedor</dt><dd>{PROVIDER_LABELS[payment.provider]}</dd></div>
        <div><dt>Estado</dt><dd>{PAYMENT_STATUS_LABELS[payment.status]}</dd></div>
      </dl>
      {actions}
    </article>
  );
}
