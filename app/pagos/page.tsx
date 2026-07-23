"use client";

import { PaymentCard, PaymentHistoryList } from "@/components/payments/PaymentHistoryList";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import type { PaymentEvent, PaymentRecord } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { ArrowRight, CreditCard, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ClientPaymentsPage() {
  const [pending, setPending] = useState<PaymentRecord[]>([]);
  const [active, setActive] = useState<PaymentRecord[]>([]);
  const [completed, setCompleted] = useState<PaymentRecord[]>([]);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

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
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function payOrder(paymentId: string, provider: "mock" | "mercadopago" = "mock") {
    setBusyId(paymentId);
    const response = await fetch(`/api/payments/orders/${paymentId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
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

  return (
    <Protected>
      <RoleGuard allowedRoles={["client", "admin"]}>
        <main className="simplePage">
          <section className="formPageCard paymentsPage">
            <div className="eyebrow"><CreditCard size={16} /> Pagos ZOVIT</div>
            <h1>Tus pagos y comprobantes</h1>
            <p className="muted">Pagos retenidos por ZOVIT hasta que confirmes que el trabajo fue completado.</p>
            {message && <p className="aiError">{message}</p>}

            <section className="paymentsSection">
              <h2>Pagos pendientes</h2>
              {pending.length === 0 ? (
                <p className="muted">No tienes pagos pendientes.</p>
              ) : (
                pending.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    actions={
                      <div className="browseProfessionalActions">
                        <button className="primaryButton" disabled={busyId === payment.id} onClick={() => void payOrder(payment.id, "mercadopago")}>
                          Pagar con Mercado Pago <ArrowRight size={16} />
                        </button>
                        <button className="secondaryButton" disabled={busyId === payment.id} onClick={() => void payOrder(payment.id, "mock")}>
                          Simular pago (dev)
                        </button>
                      </div>
                    }
                  />
                ))
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
                      payment.status === "esperando_aprobacion_cliente" ? (
                        <button className="primaryButton" disabled={busyId === payment.id} onClick={() => void approveWork(payment.id)}>
                          Confirmar trabajo y liberar pago <ArrowRight size={16} />
                        </button>
                      ) : (
                        <Link href={`/solicitudes/${payment.requestId}`} className="secondaryButton">
                          Ver estado del trabajo
                        </Link>
                      )
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
