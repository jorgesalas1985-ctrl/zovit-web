"use client";

import { PaymentCard, PaymentHistoryList } from "@/components/payments/PaymentHistoryList";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { MercadoPagoFeeNotice } from "@/components/payments/MercadoPagoFeeNotice";
import { CANCELLATION_FEE_REASON_LABELS } from "@/lib/payments/cancellationFee";
import {
  calculateClientCharge,
  type InstallmentOption,
} from "@/lib/payments/mercadopagoFees";
import type { PaymentEvent, PaymentRecord } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { ArrowRight, CreditCard, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const INSTALLMENT_CHOICES: InstallmentOption[] = [1, 3, 6, 9, 12];

type CancellationFeeRow = {
  id: string;
  public_id: string;
  request_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
};

export default function ClientPaymentsPage() {
  const [pending, setPending] = useState<PaymentRecord[]>([]);
  const [active, setActive] = useState<PaymentRecord[]>([]);
  const [completed, setCompleted] = useState<PaymentRecord[]>([]);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [cancellationFees, setCancellationFees] = useState<CancellationFeeRow[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [installmentsByPayment, setInstallmentsByPayment] = useState<
    Record<string, InstallmentOption>
  >({});

  async function loadDashboard() {
    const response = await fetch("/api/payments/dashboard/client");
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar el panel de pagos.");
      return;
    }
    setPending(data.pending ?? []);
    setActive(data.active ?? []);
    setCompleted(data.completed ?? []);
    setEvents(data.events ?? []);
    setCancellationFees(data.cancellationFees ?? []);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function payOrder(paymentId: string, provider: "mock" | "mercadopago" = "mock") {
    const installments = installmentsByPayment[paymentId] ?? 1;
    setBusyId(paymentId);
    const response = await fetch(`/api/payments/orders/${paymentId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, installments }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo procesar el pago.");
      return;
    }

    if (data.session?.redirectUrl) {
      window.location.href = data.session.redirectUrl as string;
      return;
    }

    await loadDashboard();
  }

  async function approveWork(paymentId: string) {
    setBusyId(paymentId);
    const response = await fetch(`/api/payments/orders/${paymentId}/approve`, { method: "POST" });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo aprobar el trabajo.");
      return;
    }
    await loadDashboard();
  }

  async function payCancellationFee(feeId: string) {
    setBusyId(feeId);
    const response = await fetch(`/api/payments/cancellation-fees/${feeId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo iniciar el pago del cargo.");
      return;
    }
    if (data.session?.redirectUrl || data.redirectUrl) {
      window.location.href = (data.session?.redirectUrl ?? data.redirectUrl) as string;
      return;
    }
    setMessage("Cargo por cancelación pagado.");
    await loadDashboard();
  }

  async function openDispute(paymentId: string) {
    const reason = window.prompt(
      "Describe el problema (mín. 10 caracteres). Se abrirá una disputa y el pago quedará retenido.\n\nSi ya pagaste y el profesional llegó/está en camino, el reembolso NO es automático. Acordar fuera de ZOVIT y luego cancelar puede bloquear cuentas.",
    );
    if (!reason || reason.trim().length < 10) {
      setMessage("Debes describir el motivo de la disputa.");
      return;
    }
    setBusyId(paymentId);
    const response = await fetch(`/api/payments/orders/${paymentId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo abrir la disputa.");
      return;
    }
    setMessage("Disputa abierta. ZOVIT la revisará.");
    await loadDashboard();
  }

  return (
    <Protected>
      <RoleGuard requiredMode="client">
        <main className="simplePage">
          <section className="formPageCard paymentsPage">
            <div className="eyebrow"><CreditCard size={16} /> Pagos ZOVIT</div>
            <h1>Tus pagos y comprobantes</h1>
            <p className="muted">
              Pagos retenidos por ZOVIT hasta que confirmes el trabajo. También puedes pagar cargos por
              cancelación aquí.
            </p>
            {message && <p className="aiError">{message}</p>}
            <MercadoPagoFeeNotice />

            {cancellationFees.some((f) => f.status === "pendiente") && (
              <section className="paymentsSection">
                <h2>Cargos por cancelación pendientes</h2>
                <p className="muted">
                  Debes pagarlos para poder publicar nuevas solicitudes.
                </p>
                {cancellationFees
                  .filter((f) => f.status === "pendiente")
                  .map((fee) => (
                    <article className="paymentHistoryItem" key={fee.id}>
                      <strong>
                        {fee.public_id} · {formatCLP(Number(fee.amount))}
                      </strong>
                      <p>
                        {CANCELLATION_FEE_REASON_LABELS[fee.reason] ?? fee.reason}
                      </p>
                      <div className="browseProfessionalActions">
                        <button
                          className="primaryButton"
                          disabled={busyId === fee.id}
                          onClick={() => void payCancellationFee(fee.id)}
                        >
                          Pagar cargo <ArrowRight size={16} />
                        </button>
                        <Link href={`/solicitudes/${fee.request_id}`} className="secondaryButton">
                          Ver solicitud
                        </Link>
                      </div>
                    </article>
                  ))}
              </section>
            )}

            <section className="paymentsSection">
              <h2>Pagos pendientes</h2>
              {pending.length === 0 ? (
                <p className="muted">No tienes pagos pendientes.</p>
              ) : (
                pending.map((payment) => {
                  const selected = installmentsByPayment[payment.id] ?? 1;
                  const charge = calculateClientCharge(payment.amountGross, selected);
                  return (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      actions={
                        <div className="formStack">
                          <label>
                            ¿Cómo quieres pagar?
                            <select
                              value={selected}
                              onChange={(e) =>
                                setInstallmentsByPayment((prev) => ({
                                  ...prev,
                                  [payment.id]: Number(e.target.value) as InstallmentOption,
                                }))
                              }
                            >
                              {INSTALLMENT_CHOICES.map((n) => {
                                const option = calculateClientCharge(payment.amountGross, n);
                                return (
                                  <option key={n} value={n}>
                                    {n === 1
                                      ? `Débito / contado · ${formatCLP(option.clientChargedAmount)}`
                                      : `${n} cuotas crédito · ${formatCLP(option.clientChargedAmount)} (incl. financiamiento)`}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          {charge.providerFinancingFee > 0 && (
                            <p className="muted">
                              Servicio {formatCLP(charge.serviceAmount)} + financiamiento cuotas{" "}
                              {formatCLP(charge.providerFinancingFee)} ={" "}
                              {formatCLP(charge.clientChargedAmount)}. Ese extra lo paga el cliente.
                            </p>
                          )}
                          <div className="browseProfessionalActions">
                            <button
                              className="primaryButton"
                              disabled={busyId === payment.id}
                              onClick={() => void payOrder(payment.id, "mercadopago")}
                            >
                              Pagar con Mercado Pago <ArrowRight size={16} />
                            </button>
                            {process.env.NODE_ENV !== "production" && (
                              <button
                                className="secondaryButton"
                                disabled={busyId === payment.id}
                                onClick={() => void payOrder(payment.id, "mock")}
                              >
                                Pago de prueba (solo desarrollo)
                              </button>
                            )}
                          </div>
                        </div>
                      }
                    />
                  );
                })
              )}
            </section>

            <section className="paymentsSection">
              <h2>Trabajos en curso</h2>
              {active.length === 0 ? (
                <p className="muted">No hay trabajos activos con pago retenido.</p>
              ) : (
                active.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    actions={
                      <div className="browseProfessionalActions">
                        {payment.status === "esperando_aprobacion_cliente" && (
                          <button className="primaryButton" disabled={busyId === payment.id} onClick={() => void approveWork(payment.id)}>
                            Confirmar trabajo y liberar pago <ArrowRight size={16} />
                          </button>
                        )}
                        {["pago_retenido", "trabajo_en_ejecucion", "esperando_aprobacion_cliente"].includes(
                          payment.status,
                        ) && (
                          <button
                            className="secondaryButton"
                            disabled={busyId === payment.id}
                            onClick={() => void openDispute(payment.id)}
                          >
                            Abrir disputa
                          </button>
                        )}
                        <Link href={`/solicitudes/${payment.requestId}`} className="secondaryButton">
                          Ver estado del trabajo
                        </Link>
                      </div>
                    }
                  />
                ))
              )}
            </section>

            <section className="paymentsSection">
              <h2>Historial y comprobantes</h2>
              <PaymentHistoryList events={events} />
              {completed.length > 0 && (
                <div className="paymentsSection">
                  {completed.map((payment) => (
                    <article className="receiptCard" key={payment.id}>
                      <ReceiptText size={18} />
                      <div>
                        <strong>{payment.publicId}</strong>
                        <p>{formatCLP(payment.amountGross)} · liberado {payment.releasedAt ? new Date(payment.releasedAt).toLocaleString("es-CL") : ""}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
