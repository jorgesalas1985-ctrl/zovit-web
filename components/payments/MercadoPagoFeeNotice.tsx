import {
  formatPct,
  MP_CHECKOUT_HELP_URL,
  MP_CHECKOUT_PROCESSING,
  MP_CREDIT_INSTALLMENT_SURCHARGE,
  MP_FEE_SOURCE_URL,
  MP_FEES_BUYER_NOTICE,
  MP_POINT_SMART_BASE,
} from "@/lib/payments/mercadopagoFees";

type Props = {
  compact?: boolean;
};

export function MercadoPagoFeeNotice({ compact = false }: Props) {
  if (compact) {
    return <p className="muted">{MP_FEES_BUYER_NOTICE}</p>;
  }

  return (
    <section className="moduleCard">
      <p className="kicker">MERCADO PAGO</p>
      <h2>Débito vs crédito</h2>
      <p className="muted">{MP_FEES_BUYER_NOTICE}</p>
      <dl className="requestMeta">
        <div>
          <dt>Checkout / link (referencial)</dt>
          <dd>
            {formatPct(MP_CHECKOUT_PROCESSING.immediateReleasePct)} + IVA (inmediato) ·{" "}
            {formatPct(MP_CHECKOUT_PROCESSING.release10DaysPct)} + IVA (10 días)
          </dd>
        </div>
        <div>
          <dt>Débito (Point Smart, referencial)</dt>
          <dd>
            {formatPct(MP_POINT_SMART_BASE.debitImmediatePct)} al instante · sin financiamiento extra
          </dd>
        </div>
        <div>
          <dt>Crédito (Point Smart, referencial)</dt>
          <dd>
            {formatPct(MP_POINT_SMART_BASE.creditImmediatePct)} al instante + cuotas si aplica
          </dd>
        </div>
        <div>
          <dt>Cuotas crédito (extra publicado)</dt>
          <dd>
            {MP_CREDIT_INSTALLMENT_SURCHARGE.map((row) => (
              <span key={row.installments}>
                {row.installments}× {formatPct(row.extraPct)}
                {row.installments < 12 ? " · " : ""}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <p className="muted">
        Fuentes:{" "}
        <a href={MP_FEE_SOURCE_URL} target="_blank" rel="noreferrer">
          costos Point
        </a>
        {" · "}
        <a href={MP_CHECKOUT_HELP_URL} target="_blank" rel="noreferrer">
          costos Checkout
        </a>
        . La tasa exacta la define tu cuenta Mercado Pago al momento del cobro.
      </p>
    </section>
  );
}
