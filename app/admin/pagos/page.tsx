"use client";

import { PaymentCard } from "@/components/payments/PaymentHistoryList";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import type { PaymentRecord } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { isSuperAdminRole } from "@/lib/auth/intranetRoles";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AdminStats = {
  totalVolume: number;
  totalFees: number;
  heldCount: number;
  releasedCount: number;
  disputedCount: number;
  pendingPayouts?: number;
  openCommissionFlags?: number;
  pendingCancellationFees?: number;
};

type CommissionFlag = {
  id: string;
  request_id: string;
  flag_type: string;
  chat_amount: number | null;
  official_amount: number | null;
  body_snippet: string;
  status: string;
  created_at: string;
};

type CancellationFeeRow = {
  id: string;
  public_id: string;
  request_id: string;
  client_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
};

const FLAG_LABELS: Record<string, string> = {
  chat_amount_mismatch: "Monto en chat > pago registrado",
  commission_evasion_phrase: "Frase de elusión de comisión",
  proposal_under_chat: "Propuesta menor al monto hablado",
};

type WalletRow = {
  id: string;
  user_id: string;
  available_balance: number;
  held_balance: number;
};

type DisputeRow = {
  id: string;
  payment_id: string;
  reason: string;
  status: string;
  created_at: string;
  dispute_kind?: string;
};

const DISPUTE_KIND_LABELS: Record<string, string> = {
  general: "General",
  cancelacion_post_pago: "Cancelación post-pago",
  cancelacion_post_llegada: "Cancelación post-llegada",
  calidad_servicio: "Calidad del servicio",
  no_asistencia: "No asistencia",
};

type PayoutRow = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  bank_name: string;
  bank_account_number: string;
  account_holder_name: string;
  account_holder_rut: string;
  created_at: string;
};

export default function AdminPaymentsPage() {
  const { profile, loading } = useAuth();
  const isSuperAdmin = isSuperAdminRole(profile?.intranet_role);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [commissionFlags, setCommissionFlags] = useState<CommissionFlag[]>([]);
  const [cancellationFees, setCancellationFees] = useState<CancellationFeeRow[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string }>>(
    [],
  );
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/payments/dashboard/admin");
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar el panel administrativo.");
      return;
    }
    setStats(data.stats ?? null);
    setPayments(data.payments ?? []);
    setWallets(data.wallets ?? []);
    setDisputes(data.disputes ?? []);
    setPayouts(data.payouts ?? []);
    setEvents(data.events ?? []);
    setCommissionFlags(data.commissionFlags ?? []);
    setCancellationFees(data.cancellationFees ?? []);
  }, []);

  useEffect(() => {
    if (loading || !isSuperAdmin) return;
    void load();
  }, [isSuperAdmin, loading, load]);

  async function resolveDispute(disputeId: string, resolution: "reembolso" | "liberacion") {
    const note = window.prompt("Nota de resolución (opcional):") ?? "";
    setBusyId(disputeId);
    const response = await fetch(`/api/payments/disputes/${disputeId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, note }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo resolver la disputa.");
      return;
    }
    setMessage(
      resolution === "reembolso"
        ? "Disputa resuelta: reembolso al cliente."
        : "Disputa resuelta: pago liberado al profesional.",
    );
    await load();
  }

  async function waiveCancellationFee(feeId: string) {
    const note = window.prompt("Motivo de condonación (opcional):") ?? "";
    setBusyId(feeId);
    const response = await fetch(`/api/payments/cancellation-fees/${feeId}/waive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo condonar el cargo.");
      return;
    }
    setMessage("Cargo por cancelación condonado.");
    await load();
  }

  async function resolveCommissionFlag(
    flagId: string,
    status: "revisada" | "descartada" | "sancionada",
  ) {
    const note = window.prompt("Nota administrativa (opcional):") ?? "";
    setBusyId(flagId);
    const response = await fetch(`/api/payments/commission-flags/${flagId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo resolver la alerta de comisión.");
      return;
    }
    setMessage(`Alerta de comisión marcada como ${status}.`);
    await load();
  }

  async function processPayout(payoutId: string, action: "aprobar" | "pagar" | "rechazar") {
    const note = window.prompt("Nota administrativa (opcional):") ?? "";
    setBusyId(payoutId);
    const response = await fetch(`/api/payments/payouts/${payoutId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo procesar el retiro.");
      return;
    }
    setMessage(`Retiro: acción ${action} aplicada.`);
    await load();
  }

  async function emitHaulmerDte(paymentId: string) {
    setBusyId(paymentId);
    const response = await fetch(`/api/payments/orders/${paymentId}/dte`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dteType: 39, scope: "service" }),
    });
    const data = await response.json();
    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo emitir el DTE Haulmer.");
      return;
    }
    const folio = data.document?.folio ?? "s/n";
    setMessage(
      data.alreadyIssued
        ? `DTE ya emitido (folio ${folio}).`
        : `Boleta Haulmer emitida (folio ${folio}).`,
    );
  }

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

  const openDisputes = disputes.filter((d) => ["abierta", "en_revision"].includes(d.status));
  const openPayouts = payouts.filter((p) => ["pendiente", "aprobado"].includes(p.status));
  const openFlags = commissionFlags.filter((f) => f.status === "abierta");
  const pendingCancelFees = cancellationFees.filter((f) => f.status === "pendiente");

  return (
    <Protected>
      <main className="simplePage">
        <section className="formPageCard paymentsPage">
          <div className="eyebrow">
            <ShieldCheck size={16} /> Super administrador
          </div>
          <h1>Estados de cuenta, disputas y retiros</h1>
          <p className="muted">
            Escrow, disputas, retiros y supervisión de elusión de comisión (montos en chat vs pago
            oficial).
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
                <span>En retención / curso</span>
              </article>
              <article className="walletCard">
                <strong>{stats.disputedCount}</strong>
                <span>En disputa</span>
              </article>
              <article className="walletCard">
                <strong>{stats.pendingPayouts ?? openPayouts.length}</strong>
                <span>Retiros pendientes</span>
              </article>
              <article className="walletCard">
                <strong>{stats.openCommissionFlags ?? openFlags.length}</strong>
                <span>Alertas comisión</span>
              </article>
              <article className="walletCard">
                <strong>{stats.pendingCancellationFees ?? pendingCancelFees.length}</strong>
                <span>Cargos cancelación</span>
              </article>
            </div>
          )}

          <section className="paymentsSection">
            <h2>Cargos por cancelación pendientes</h2>
            {pendingCancelFees.length === 0 ? (
              <p className="muted">Sin cargos pendientes.</p>
            ) : (
              pendingCancelFees.map((fee) => (
                <article className="paymentHistoryItem" key={fee.id}>
                  <strong>
                    {fee.public_id} · {formatCLP(Number(fee.amount))} · {fee.reason}
                  </strong>
                  <p className="muted">
                    Cliente {fee.client_id.slice(0, 8)}… · Solicitud {fee.request_id.slice(0, 8)}…
                  </p>
                  <div className="browseProfessionalActions">
                    <Link className="secondaryButton" href={`/solicitudes/${fee.request_id}`}>
                      Ver solicitud
                    </Link>
                    <button
                      className="secondaryButton"
                      disabled={busyId === fee.id}
                      onClick={() => void waiveCancellationFee(fee.id)}
                    >
                      Condonar
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="paymentsSection">
            <h2>Alertas de elusión de comisión</h2>
            {openFlags.length === 0 ? (
              <p className="muted">Sin alertas abiertas.</p>
            ) : (
              openFlags.map((flag) => (
                <article className="paymentHistoryItem" key={flag.id}>
                  <strong>{FLAG_LABELS[flag.flag_type] ?? flag.flag_type}</strong>
                  <p>{flag.body_snippet}</p>
                  <p className="muted">
                    Chat {flag.chat_amount != null ? formatCLP(Number(flag.chat_amount)) : "—"} ·
                    Oficial{" "}
                    {flag.official_amount != null ? formatCLP(Number(flag.official_amount)) : "—"} ·
                    Solicitud {flag.request_id.slice(0, 8)}…
                  </p>
                  <div className="browseProfessionalActions">
                    <Link className="secondaryButton" href={`/solicitudes/${flag.request_id}`}>
                      Ver solicitud
                    </Link>
                    <button
                      className="secondaryButton"
                      disabled={busyId === flag.id}
                      onClick={() => void resolveCommissionFlag(flag.id, "descartada")}
                    >
                      Descartar
                    </button>
                    <button
                      className="secondaryButton"
                      disabled={busyId === flag.id}
                      onClick={() => void resolveCommissionFlag(flag.id, "revisada")}
                    >
                      Revisada
                    </button>
                    <button
                      className="primaryButton"
                      disabled={busyId === flag.id}
                      onClick={() => void resolveCommissionFlag(flag.id, "sancionada")}
                    >
                      Marcar sanción
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="paymentsSection">
            <h2>Disputas abiertas</h2>
            {openDisputes.length === 0 ? (
              <p className="muted">Sin disputas abiertas.</p>
            ) : (
              openDisputes.map((dispute) => (
                <article className="paymentHistoryItem" key={dispute.id}>
                  <strong>
                    {dispute.status}
                    {dispute.dispute_kind
                      ? ` · ${DISPUTE_KIND_LABELS[dispute.dispute_kind] ?? dispute.dispute_kind}`
                      : ""}
                  </strong>
                  <p>{dispute.reason}</p>
                  {(dispute.dispute_kind === "cancelacion_post_llegada" ||
                    dispute.dispute_kind === "cancelacion_post_pago") && (
                    <p className="muted">
                      Regla: tras pago/llegada el reembolso no es automático. Si hay indicios de trato
                      fuera de ZOVIT, prioriza liberar al profesional o sancionar.
                    </p>
                  )}
                  <div className="browseProfessionalActions">
                    <button
                      className="secondaryButton"
                      disabled={busyId === dispute.id}
                      onClick={() => void resolveDispute(dispute.id, "reembolso")}
                    >
                      Resolver → reembolso
                    </button>
                    <button
                      className="primaryButton"
                      disabled={busyId === dispute.id}
                      onClick={() => void resolveDispute(dispute.id, "liberacion")}
                    >
                      Resolver → liberar al pro
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="paymentsSection">
            <h2>Retiros a profesionales</h2>
            {openPayouts.length === 0 ? (
              <p className="muted">Sin retiros pendientes.</p>
            ) : (
              openPayouts.map((payout) => (
                <article className="paymentHistoryItem" key={payout.id}>
                  <strong>
                    {formatCLP(Number(payout.amount))} · {payout.status}
                  </strong>
                  <p>
                    {payout.account_holder_name} · {payout.bank_name} ·{" "}
                    {payout.bank_account_number} · RUT {payout.account_holder_rut}
                  </p>
                  <div className="browseProfessionalActions">
                    {payout.status === "pendiente" && (
                      <button
                        className="secondaryButton"
                        disabled={busyId === payout.id}
                        onClick={() => void processPayout(payout.id, "aprobar")}
                      >
                        Aprobar
                      </button>
                    )}
                    <button
                      className="primaryButton"
                      disabled={busyId === payout.id}
                      onClick={() => void processPayout(payout.id, "pagar")}
                    >
                      Marcar transferido
                    </button>
                    <button
                      className="secondaryButton"
                      disabled={busyId === payout.id}
                      onClick={() => void processPayout(payout.id, "rechazar")}
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="paymentsSection">
            <h2>Wallets</h2>
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
              <PaymentCard
                key={payment.id}
                payment={payment}
                actions={
                  [
                    "pago_recibido",
                    "pago_retenido",
                    "trabajo_en_ejecucion",
                    "trabajo_finalizado",
                    "esperando_aprobacion_cliente",
                    "pago_liberado",
                  ].includes(payment.status) ? (
                    <div className="browseProfessionalActions">
                      <Link className="secondaryButton" href={`/pagos/comprobante/${payment.id}`}>
                        Comprobante
                      </Link>
                      <button
                        className="secondaryButton"
                        disabled={busyId === payment.id}
                        onClick={() => void emitHaulmerDte(payment.id)}
                      >
                        Emitir boleta Haulmer
                      </button>
                    </div>
                  ) : undefined
                }
              />
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
