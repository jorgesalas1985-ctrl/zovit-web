"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import {
  IDENTITY_DOCUMENT_LABELS,
  type PendingVerificationUser,
} from "@/lib/verification/types";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function IntranetVerificationPage() {
  const [pending, setPending] = useState<PendingVerificationUser[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  async function loadPending() {
    const response = await fetch("/api/intranet/verification", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar la cola de verificación.");
      return;
    }
    setPending(data.pending ?? []);
  }

  useEffect(() => {
    void loadPending();
  }, []);

  async function loadPreview(profileId: string) {
    const response = await fetch(`/api/intranet/verification/${profileId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudieron abrir los documentos.");
      return;
    }

    const next: Record<string, string> = {};
    for (const doc of data.documents ?? []) {
      if (doc.signedUrl) next[`${profileId}:${doc.document_type}`] = doc.signedUrl;
    }
    setPreviewUrls((prev) => ({ ...prev, ...next }));
  }

  async function review(profileId: string, action: "approve" | "reject") {
    const reason =
      action === "reject"
        ? window.prompt("Motivo del rechazo (visible para el usuario):")
        : null;

    if (action === "reject" && !reason?.trim()) return;

    setBusyId(profileId);
    setMessage("");

    const response = await fetch(`/api/intranet/verification/${profileId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: reason?.trim() }),
    });
    const data = await response.json();

    setBusyId("");
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo completar la revisión.");
      return;
    }

    await loadPending();
    setMessage(action === "approve" ? "Verificación aprobada." : "Verificación rechazada.");
  }

  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        wide
        title="Verificación de identidad"
        description="Revisa cédula, selfie y prueba de vida antes de activar el sello verificado."
        kicker="REVISIÓN MANUAL"
      >
        <div className="eyebrow">
          <ShieldCheck size={16} /> Cola de verificación
        </div>

        {message && <p className="aiError">{message}</p>}

        {pending.length === 0 ? (
          <p className="muted">No hay verificaciones pendientes.</p>
        ) : (
          <div className="verificationAdminList">
            {pending.map((item) => {
              const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ") || item.id;
              return (
                <article className="verificationAdminCard" key={item.id}>
                  <div>
                    <strong>{fullName}</strong>
                    <p>
                      {item.role} · RUT {item.rut ?? "—"} ·{" "}
                      {item.identity_submitted_at
                        ? new Date(item.identity_submitted_at).toLocaleString("es-CL")
                        : "—"}
                    </p>
                  </div>

                  <div className="verificationAdminDocs">
                    {item.documents.length === 0 ? (
                      <p className="muted">Sin documentos adjuntos.</p>
                    ) : (
                      item.documents.map((doc) => {
                        const key = `${item.id}:${doc.document_type}`;
                        const url = previewUrls[key];
                        const meta = doc.metadata as Record<string, unknown> | null;
                        return (
                          <div className="verificationAdminDoc" key={doc.id}>
                            <div>
                              <span>{IDENTITY_DOCUMENT_LABELS[doc.document_type]}</span>
                              {typeof meta?.challengeCode === "string" && meta.challengeCode && (
                                <small className="verificationMeta">
                                  Código prueba de vida: {meta.challengeCode}
                                </small>
                              )}
                              {typeof meta?.challengeInstruction === "string" && meta.challengeInstruction && (
                                <small className="verificationMeta">{meta.challengeInstruction}</small>
                              )}
                            </div>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="textLink">
                                Ver documento
                              </a>
                            ) : (
                              <button
                                type="button"
                                className="linkButton"
                                onClick={() => void loadPreview(item.id)}
                              >
                                Generar enlace
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="browseProfessionalActions">
                    <button
                      className="primaryButton"
                      disabled={busyId === item.id}
                      onClick={() => void review(item.id, "approve")}
                    >
                      Aprobar
                    </button>
                    <button
                      className="secondaryButton"
                      disabled={busyId === item.id}
                      onClick={() => void review(item.id, "reject")}
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Link href="/intranet/admin" className="secondaryButton wide">
          Volver a administración
        </Link>
      </IntranetShell>
    </IntranetGuard>
  );
}
