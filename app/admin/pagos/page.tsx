"use client";

import { PaymentCard } from "@/components/payments/PaymentHistoryList";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import type { PaymentRecord } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type AdminStats = {
  totalVolume: number;
  totalFees: number;
  heldCount: number;
  releasedCount: number;
  disputedCount: number;
};

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string }>>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/payments/dashboard/admin");
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "No se pudo cargar el panel administrativo.");
        return;
      }
      setStats(data.stats ?? null);
      setPayments(data.payments ?? []);
      setEvents(data.events ?? []);
    }
    void load();
  }, []);

  return (
    <Protected>
      <RoleGuard allowedRoles={["admin"]}>
        <main className="simplePage">
          <section className="formPageCard paymentsPage">
            <div className="eyebrow"><ShieldCheck size={16} /> Administración ZOVIT</div>
            <h1>Panel de pagos</h1>
            <p className="muted">Supervisión de pagos, wallets, disputas y comisiones.</p>
            {message && <p className="aiError">{message}</p>}

            {stats && (
              <div className="walletGrid">
                <article className="walletCard"><strong>{formatCLP(stats.totalVolume)}</strong><span>Volumen total</span></article>
                <article className="walletCard"><strong>{formatCLP(stats.totalFees)}</strong><span>Comisiones</span></article>
                <article className="walletCard"><strong>{stats.heldCount}</strong><span>Pagos retenidos</span></article>
                <article className="walletCard"><strong>{stats.releasedCount}</strong><span>Pagos liberados</span></article>
              </div>
            )}

            <section className="paymentsSection">
              <h2>Pagos recientes</h2>
              {payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </section>

            <section className="paymentsSection">
              <h2>Auditoría reciente</h2>
              <div className="paymentHistoryList">
                {events.map((event) => (
                  <article className="paymentHistoryItem" key={event.id}>
                    <strong>{event.event_type}</strong>
                    <time>{new Date(event.created_at).toLocaleString("es-CL")}</time>
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
