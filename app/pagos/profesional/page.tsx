"use client";

import { PaymentCard } from "@/components/payments/PaymentHistoryList";
import { WalletSummaryCards } from "@/components/payments/WalletSummary";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import type { PaymentRecord, WalletSummary } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type WalletTransaction = {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
};

export default function ProfessionalPaymentsPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [upcoming, setUpcoming] = useState<PaymentRecord[]>([]);
  const [received, setReceived] = useState<PaymentRecord[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  async function loadDashboard() {
    const response = await fetch("/api/payments/dashboard/professional");
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar tu wallet.");
      return;
    }
    setSummary(data.summary ?? null);
    setUpcoming(data.upcoming ?? []);
    setReceived(data.received ?? []);
    setTransactions(data.transactions ?? []);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function startWork(paymentId: string) {
    setBusyId(paymentId);
    const response = await fetch(`/api/payments/orders/${paymentId}/start-work`, { method: "POST" });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo iniciar el trabajo.");
      return;
    }
    await loadDashboard();
  }

  async function completeWork(paymentId: string) {
    setBusyId(paymentId);
    const response = await fetch(`/api/payments/orders/${paymentId}/complete-work`, { method: "POST" });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo marcar como finalizado.");
      return;
    }
    await loadDashboard();
  }

  return (
    <Protected>
      <RoleGuard requiredMode="professional">
        <main className="simplePage">
          <section className="formPageCard paymentsPage">
            <div className="eyebrow"><Wallet size={16} /> Wallet ZOVIT</div>
            <h1>Ingresos y pagos del profesional</h1>
            <p className="muted">Tu dinero queda retenido hasta que el cliente confirme el servicio.</p>
            {message && <p className="aiError">{message}</p>}

            {summary && <WalletSummaryCards summary={summary} />}

            <section className="paymentsSection">
              <h2>Próximos pagos / trabajos activos</h2>
              {upcoming.length === 0 ? (
                <p className="muted">No tienes pagos retenidos activos.</p>
              ) : (
                upcoming.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    actions={
                      <div className="browseProfessionalActions">
                        {payment.status === "pago_retenido" && (
                          <button className="primaryButton" disabled={busyId === payment.id} onClick={() => void startWork(payment.id)}>
                            Iniciar trabajo <ArrowRight size={16} />
                          </button>
                        )}
                        {payment.status === "trabajo_en_ejecucion" && (
                          <button className="primaryButton" disabled={busyId === payment.id} onClick={() => void completeWork(payment.id)}>
                            Marcar finalizado <ArrowRight size={16} />
                          </button>
                        )}
                        <Link href={`/solicitudes/${payment.requestId}`} className="secondaryButton">
                          Ver solicitud
                        </Link>
                      </div>
                    }
                  />
                ))
              )}
            </section>

            <section className="paymentsSection">
              <h2>Pagos recibidos</h2>
              {received.length === 0 ? (
                <p className="muted">Aún no tienes pagos liberados.</p>
              ) : (
                received.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
              )}
            </section>

            <section className="paymentsSection">
              <h2>Movimientos auditados</h2>
              <div className="paymentHistoryList">
                {transactions.map((tx) => (
                  <article className="paymentHistoryItem" key={tx.id}>
                    <strong>{tx.transaction_type}</strong>
                    <p>{tx.description}</p>
                    <div className="paymentHistoryMeta">
                      <span>{formatCLP(Number(tx.amount))}</span>
                      <time>{new Date(tx.created_at).toLocaleString("es-CL")}</time>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
