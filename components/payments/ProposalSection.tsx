"use client";

import { formatCLP, type ServiceProposal } from "@/lib/payments/types";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight, CheckCircle2, HandCoins, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Props = {
  requestId: string;
  requestStatus: string;
  isClient: boolean;
  isProfessional: boolean;
  fuelAmount: number;
  serviceAmount: number;
};

export function ProposalSection({ requestId, requestStatus, isClient, isProfessional, fuelAmount, serviceAmount }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [proposals, setProposals] = useState<ServiceProposal[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/payments/proposals?requestId=${encodeURIComponent(requestId)}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as {
      error?: string;
      proposals?: ServiceProposal[];
    };

    if (!response.ok) {
      setMessage(data.error ?? "No se pudieron cargar las propuestas.");
      setProposals([]);
    } else {
      setMessage("");
      setProposals(data.proposals ?? []);
    }
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  async function acceptService() {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("accept_service_request", {
      request_id: requestId,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message || "No se pudo aceptar el servicio.");
      return;
    }
    setMessage("Servicio aceptado. El cliente fue notificado.");
    router.refresh();
  }

  function rejectService() {
    router.push("/trabajos");
  }

  async function acceptProposal(proposalId: string) {
    setBusy(true);
    setMessage("");

    const response = await fetch(`/api/payments/proposals/${proposalId}/accept`, { method: "POST" });
    const data = (await response.json()) as { error?: string; paymentPublicId?: string };

    if (!response.ok) {
      setBusy(false);
      setMessage(data.error ?? "No se pudo aceptar la propuesta.");
      return;
    }

    const payUrl = data.paymentPublicId
      ? `/pagos?payment=${encodeURIComponent(data.paymentPublicId)}`
      : "/pagos";
    setMessage("Propuesta aceptada. Te llevamos a pagar con protección ZOVIT…");
    router.push(payUrl);
    router.refresh();
  }

  if (requestStatus !== "publicada" && proposals.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="moduleCard">
      <div className="moduleHeading">
        <div>
          <p className="kicker">PAGOS ZOVIT</p>
          <h2>{isProfessional ? "Pago por el servicio" : "Propuestas y cotización"}</h2>
        </div>
        <HandCoins />
      </div>

      {message && (
        <div className="formMessage">
          <AlertCircle size={17} /> {message}
        </div>
      )}

      {isProfessional && requestStatus === "publicada" && (
        <div className="formStack">
          <div className="proposalCard">
            <div className="proposalCardTop"><strong>Recibirás como profesional</strong><strong>{formatCLP(fuelAmount + serviceAmount)}</strong></div>
          </div>
          <p className="muted">El IVA del servicio es retenido por ZOVIT para su declaración y pago mensual al SII.</p>
          <button className="primaryButton fullButton" disabled={busy} onClick={() => void acceptService()}>
            <CheckCircle2 size={17} /> {busy ? "Aceptando…" : "Aceptar servicio"}
          </button>
          <button className="secondaryButton fullButton" disabled={busy} onClick={rejectService}>
            <X size={17} /> Rechazar servicio
          </button>
        </div>
      )}

      {!isProfessional && (loading ? (
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
      ))}
    </section>
  );
}
