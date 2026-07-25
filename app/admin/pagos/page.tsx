"use client";

import { PaymentCard } from "@/components/payments/PaymentHistoryList";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import type { PaymentRecord } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { isSuperAdminRole } from "@/lib/auth/intranetRoles";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type AdminStats = {
  totalVolume: number;
  totalFees: number;
  heldCount: number;
  releasedCount: number;
  disputedCount: number;
};

type WalletRow = {
  id: string;
  user_id: string;
  available_balance: number;
  held_balance: number;
  currency: string;
};

export default function AdminPaymentsPage() {
  const { profile, loading } = useAuth();
  const isSuperAdmin = isSuperAdminRole(profile?.intranet_role);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string }>>(
    [],
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading || !isSuperAdmin) return;

    async function load() {
      const response = await fetch("/api/payments/dashboard/admin");
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "No se pudo cargar el panel administrativo.");
        return;
      }
      setStats(data.stats ?? null);
      setPayments(data.payments ?? []);
      setWallets(data.wallets ?? []);
      setEvents(data.events ?? []);
    }
    void load();
  }, [isSuperAdmin, loading]);

  if (loading) {
    return <div className="centerState">Cargando…</div>;
  }

  if (!isSuperAdmin) {
    return (
      <Protected>
        <main className="simplePage">
          <section className="formPageCard">
            <h1>Acceso restringido</h1>
            <p className="muted">
              Solo el super administrador puede ver estados de cuenta y dineros. RR.HH. no tiene
              este privilegio.
            </p>
            <Link href="/intranet/finanzas" className="secondaryButton">
              Volver
            </Link>
          </section>
        </main>
      </Protected>
    );
  }

  return (
    <Protected>
      <main className="simplePage">
        <section className="formPageCard paymentsPage">
          <div className="eyebrow">
            <ShieldCheck size={16} /> Super administrador
          </div>
          <h1>Estados de cuenta y pagos</h1>
          <p className="muted">
            Supervisión exclusiva de wallets, retenciones, liberaciones, disputas y comisiones.
          </p>
          {message && <p className="aiError">{message}</p>}

          {stats && (
            <div className="walletGrid">
              <article className="walletCard">
                <strong>{formatCLP(stats.totalVolume)}</strong>
                <span>Volumen total</span>
              </article>
              <article className="walletCard">
                <strong>{formatCLP(stats.totalFees)}</strong>
                <span>Comisiones</span>
              </article>
              <article className="walletCard">
                <strong>{stats.heldCount}</strong>
                <span>Pagos retenidos</span>
              </article>
              <article className="walletCard">
                <strong>{stats.releasedCount}</strong>
                <span>Pagos liberados</span>
              </article>
            </div>
          )}

          <section className="paymentsSection">
            <h2>Wallets (estados de cuenta)</h2>
            {wallets.length === 0 ? (
              <p className="muted">Sin wallets aún.</p>
            ) : (
              <div className="paymentHistoryList">
                {wallets.map((wallet) => (
                  <article className="paymentHistoryItem" key={wallet.id}>
                    <strong>{wallet.user_id.slice(0, 8)}…</strong>
                    <span>
                      Disponible {formatCLP(Number(wallet.available_balance))} · Retenido{" "}
                      {formatCLP(Number(wallet.held_balance))}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

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
    </Protected>
  );
}
