"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { FloatingToast } from "@/components/ui/FloatingToast";
import { IDENTITY_DOCUMENT_LABELS, type PendingVerificationUser } from "@/lib/verification/types";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ApprovedIdentitiesPage() {
  const [approved, setApproved] = useState<PendingVerificationUser[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");

  async function returnToReview(profileId: string, fullName: string) {
    if (!window.confirm(`¿Devolver a ${fullName} a revisión? Sus documentos deberán revisarse nuevamente.`)) return;
    setBusyId(profileId);
    setError("");
    try {
      const response = await fetch(`/api/intranet/verification/${profileId}/return-to-review`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo devolver la identidad a revisión.");
      setApproved((current) => current.filter((item) => item.id !== profileId));
      setMessage(`${fullName} fue devuelto a la cola de revisión.`);
    } catch (returnError) {
      setError(returnError instanceof Error ? returnError.message : "No se pudo devolver la identidad a revisión.");
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    const pendingToast = window.sessionStorage.getItem("zovit-verification-toast");
    if (pendingToast) {
      setToast(pendingToast);
      window.sessionStorage.removeItem("zovit-verification-toast");
    }
    void (async () => {
      try {
        const response = await fetch("/api/intranet/verification", { cache: "no-store" });
        const data = await response.json().catch(() => ({})) as { checked?: PendingVerificationUser[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las identidades aprobadas.");
        setApproved(data.checked ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las identidades aprobadas.");
      }
    })();
  }, []);

  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        wide
        title="Identidades aprobadas"
        description="Historial de identidades ya finalizadas. Aquí no hay acciones de aprobación pendientes."
        kicker="VERIFICACIÓN FINALIZADA"
      >
        {toast ? <FloatingToast message={toast} tone="success" seconds={10} onClose={() => setToast("")} /> : null}
        <div className="verificationQueueNav">
          <Link className="secondaryButton" href="/intranet/admin/verificacion">Volver a pendientes</Link>
        </div>
        {error ? <p className="formError">{error}</p> : null}
        {message ? <p className="formSuccess">{message}</p> : null}
        {!error && approved.length === 0 ? <p className="muted">No hay identidades aprobadas recientemente.</p> : null}
        <div className="ocrCheckedList">
          {approved.map((item) => {
            const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ") || "Sin nombre";
            return (
              <article className="ocrCheckedCard is-approved" key={item.id}>
                <div className="ocrCheckedStatus"><CheckCircle2 size={21} /><strong>Identidad aprobada</strong></div>
                <dl className="ocrCheckedData">
                  <div><dt>Nombre</dt><dd>{fullName}</dd></div>
                  <div><dt>RUT</dt><dd>{item.rut ?? "No informado"}</dd></div>
                  <div><dt>Cuenta</dt><dd>{item.role}</dd></div>
                  <div><dt>Resultado</dt><dd>{item.identity_ai_summary ?? "Identidad validada."}</dd></div>
                </dl>
                <ul className="ocrDocumentChecklist">
                  {item.documents.map((document) => <li className="is-approved" key={document.id}><ShieldCheck size={15} /> {IDENTITY_DOCUMENT_LABELS[document.document_type]}</li>)}
                </ul>
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={busyId === item.id}
                  onClick={() => void returnToReview(item.id, fullName)}
                >
                  {busyId === item.id ? "Devolviendo…" : "Volver a revisión"}
                </button>
              </article>
            );
          })}
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
