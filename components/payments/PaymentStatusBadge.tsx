import type { PaymentStatus } from "@/lib/payments/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/payments/types";

const STATUS_CLASS: Partial<Record<PaymentStatus, string>> = {
  esperando_pago: "paymentBadge-warn",
  pago_retenido: "paymentBadge-info",
  trabajo_en_ejecucion: "paymentBadge-info",
  esperando_aprobacion_cliente: "paymentBadge-warn",
  pago_liberado: "paymentBadge-success",
  reembolsado: "paymentBadge-muted",
  cancelado: "paymentBadge-muted",
  en_disputa: "paymentBadge-danger",
};

type Props = {
  status: PaymentStatus;
};

export function PaymentStatusBadge({ status }: Props) {
  return (
    <span className={`paymentBadge ${STATUS_CLASS[status] ?? "paymentBadge-neutral"}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
