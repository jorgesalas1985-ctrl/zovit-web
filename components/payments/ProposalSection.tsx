"use client";

import { calculateBreakdown, formatCLP, type ServiceProposal } from "@/lib/payments/types";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowRight, HandCoins } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Props = {
  requestId: string;
  requestStatus: string;
  isClient: boolean;
  isProfessional: boolean;
};

export function ProposalSection({ requestId, requestStatus, isClient, isProfessional }: Props) {
  const [proposals, setProposals] = useState<ServiceProposal[]>([]);
  const [amount, setAmount] = useState("45000");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProposals() {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_proposals")
      .select("id,request_id,professional_id,amount,currency,description,estimated_hours,status,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setProposals([]);
    } else {
      setProposals(
        (data ?? []).map((row) => ({
          id: row.id,
          requestId: row.request_id,
          professionalId: row.professional_id,
          amount: Number(row.amount),
          currency: row.currency,
          description: row.description,
          estimatedHours: row.estimated_hours != null ? Number(row.estimated_hours) : null,
          status: row.status,
          createdAt: row.created_at,
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadProposals();
  }, [requestId]);

  async function submitProposal(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc("create_service_proposal", {
      p_request_id: requestId,
      p_amount: Number(amount),
      p_description: description,
      p_estimated_hours: hours ? Number(hours) : null,
    });

    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setDescription("");
    await loadProposals();
  }

  async function acceptProposal(proposalId: string) {
    setBusy(true);
    setMessage("");

    const response = await fetch(`/api/payments/proposals/${proposalId}/accept`, { method: "POST" });
    const data = (await response.json()) as { error?: string; paymentPublicId?: string };

    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo aceptar la propuesta.");
      return;
    }

    setMessage(`Propuesta aceptada. Orden de pago ${data.paymentPublicId ?? ""} creada.`);
    await loadProposals();
  }

  if (requestStatus !== "publicada" && proposals.length === 0 && !loading) {
    return null;
  }

  const breakdown = calculateBreakdown(Number(amount) || 0);

  return (
    <section className="moduleCard">
      <div className="moduleHeading">
        <div>
          <p className="kicker">PAGOS ZOVIT</p>
          <h2>Propuestas y cotización</h2>
        </div>
        <HandCoins />
      </div>

      {message && (
        <div className="formMessage">
          <AlertCircle size={17} /> {message}
        </div>
      )}

      {isProfessional && requestStatus === "publicada" && (
        <form className="formStack" onSubmit={submitProposal}>
          <label>
            Monto propuesto (CLP)
            <input type="number" min={5000} step={1000} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <p className="muted">
            Comisión estimada ZOVIT: {formatCLP(breakdown.platformFee)} + IVA {formatCLP(breakdown.taxAmount)} · Neto profesional {formatCLP(breakdown.amountNet)}
          </p>
          <label>
            Detalle de la propuesta
            <textarea required minLength={10} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué incluye tu servicio, plazos y condiciones…" />
          </label>
          <label>
            Horas estimadas (opcional)
            <input type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <button className="primaryButton fullButton" disabled={busy}>
            Enviar propuesta <ArrowRight size={16} />
          </button>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando propuestas…</p>
      ) : proposals.length === 0 ? (
        <p className="muted">Aún no hay propuestas para esta solicitud.</p>
      ) : (
        <div className="proposalList">
          {proposals.map((proposal) => (
            <article className="proposalCard" key={proposal.id}>
              <div className="proposalCardTop">
                <strong>{formatCLP(proposal.amount)}</strong>
              <span className="paymentBadge paymentBadge-neutral">{proposal.status}</span>
              </div>
              <p>{proposal.description}</p>
              {proposal.estimatedHours != null && (
                <p className="muted">Horas estimadas: {proposal.estimatedHours}</p>
              )}
              {isClient && proposal.status === "pendiente" && requestStatus === "publicada" && (
                <button className="primaryButton fullButton" disabled={busy} onClick={() => void acceptProposal(proposal.id)}>
                  Aceptar propuesta y generar pago <ArrowRight size={16} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
