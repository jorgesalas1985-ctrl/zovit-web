"use client";

import { PaymentCard } from "@/components/payments/PaymentHistoryList";
import { WalletSummaryCards } from "@/components/payments/WalletSummary";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import type { PaymentRecord, WalletSummary } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: "",
    bankName: "",
    bankAccountType: "cuenta_vista",
    bankAccountNumber: "",
    accountHolderName: "",
    accountHolderRut: "",
  });

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

  async function requestPayout(event: FormEvent) {
    event.preventDefault();
    setPayoutBusy(true);
    setMessage("");
    const response = await fetch("/api/payments/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(payoutForm.amount),
        bankName: payoutForm.bankName,
        bankAccountType: payoutForm.bankAccountType,
        bankAccountNumber: payoutForm.bankAccountNumber,
        accountHolderName: payoutForm.accountHolderName,
        accountHolderRut: payoutForm.accountHolderRut,
      }),
    });
    const data = await response.json();
    setPayoutBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo solicitar el retiro.");
      return;
    }
    setMessage("Retiro solicitado. ZOVIT lo transferirá tras revisión del super admin.");
    setPayoutForm((prev) => ({ ...prev, amount: "" }));
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
              <h2>Solicitar retiro</h2>
              <p className="muted">
                Retira tu saldo disponible a tu cuenta bancaria. Mínimo $1.000. El super admin
                aprueba y marca la transferencia.
              </p>
              <form className="formStack" onSubmit={(event) => void requestPayout(event)}>
                <label>
                  Monto CLP
                  <input
                    type="number"
                    min={1000}
                    required
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </label>
                <label>
                  Banco
                  <input
                    required
                    value={payoutForm.bankName}
                    onChange={(e) => setPayoutForm((p) => ({ ...p, bankName: e.target.value }))}
                    placeholder="Banco Estado"
                  />
                </label>
                <label>
                  Tipo de cuenta
                  <select
                    value={payoutForm.bankAccountType}
                    onChange={(e) =>
                      setPayoutForm((p) => ({ ...p, bankAccountType: e.target.value }))
                    }
                  >
                    <option value="cuenta_vista">Cuenta vista</option>
                    <option value="cuenta_corriente">Cuenta corriente</option>
                    <option value="cuenta_rut">Cuenta RUT</option>
                  </select>
                </label>
                <label>
                  Número de cuenta
                  <input
                    required
                    value={payoutForm.bankAccountNumber}
                    onChange={(e) =>
                      setPayoutForm((p) => ({ ...p, bankAccountNumber: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Titular
                  <input
                    required
                    value={payoutForm.accountHolderName}
                    onChange={(e) =>
                      setPayoutForm((p) => ({ ...p, accountHolderName: e.target.value }))
                    }
                  />
                </label>
                <label>
                  RUT titular
                  <input
                    required
                    value={payoutForm.accountHolderRut}
                    onChange={(e) =>
                      setPayoutForm((p) => ({ ...p, accountHolderRut: e.target.value }))
                    }
                  />
                </label>
                <button className="primaryButton" type="submit" disabled={payoutBusy}>
                  {payoutBusy ? "Enviando…" : "Solicitar retiro"}
                </button>
              </form>
            </section>

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
