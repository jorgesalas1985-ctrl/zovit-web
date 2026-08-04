"use client";

import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { FloatingToast } from "@/components/ui/FloatingToast";
import {
  IDENTITY_DOCUMENT_LABELS,
  type PendingVerificationUser,
} from "@/lib/verification/types";
import { isoToChileanDate } from "@/lib/ui/chileanDate";
import { Bot, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AiQueueStats = {
  pending: number;
  dudosos: number;
  openaiConfigured: boolean;
};

type AiBatchResult = {
  processed: number;
  approved: number;
  rejected: number;
  dudoso: number;
};

type ToastState = { message: string; tone: "error" | "success" | "info" };

function aiLabel(status: string | null | undefined) {
  if (!status) return "sin revisar";
  if (status === "dudoso") return "dudoso (revisión humana)";
  if (status === "processing") return "procesando…";
  if (status === "pending") return "en cola IA";
  return status;
}

export default function AdminVerificationPage() {
  const [pending, setPending] = useState<PendingVerificationUser[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [busyId, setBusyId] = useState("");
  const [carnetMatches, setCarnetMatches] = useState<Record<string, boolean>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStats, setAiStats] = useState<AiQueueStats | null>(null);
  const [lastAiBatch, setLastAiBatch] = useState<AiBatchResult | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  function showToast(message: string, tone: ToastState["tone"] = "error") {
    setToast({ message, tone });
  }

  async function loadPending() {
    const response = await fetch("/api/admin/verification");
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "No se pudo cargar la cola de verificación.");
      return;
    }
    setPending(data.pending ?? []);
  }

  async function loadAiStats() {
    const response = await fetch("/api/admin/verification/ai-validate", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return;
    const stats = {
      pending: data.pending ?? 0,
      dudosos: data.dudosos ?? 0,
      openaiConfigured: Boolean(data.openaiConfigured),
    };
    setAiStats(stats);
  }

  useEffect(() => {
    void loadPending();
    void loadAiStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function processAiQueue(includeDudosos = false) {
    setAiBusy(true);
    let total: AiBatchResult = { processed: 0, approved: 0, rejected: 0, dudoso: 0 };
    let guard = 0;

    while (guard < 10) {
      guard += 1;
      const response = await fetch("/api/admin/verification/ai-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 8, includeDudosos: includeDudosos && guard === 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error ?? "No se pudo procesar la cola con IA.");
        setAiBusy(false);
        await loadAiStats();
        return;
      }
      total = {
        processed: total.processed + (data.processed ?? 0),
        approved: total.approved + (data.approved ?? 0),
        rejected: total.rejected + (data.rejected ?? 0),
        dudoso: total.dudoso + (data.dudoso ?? 0),
      };
      if (!data.processed) break;
    }

    setLastAiBatch(total);
    showToast(
      total.processed
        ? `IA procesó ${total.processed}: ${total.approved} aprobados, ${total.rejected} rechazados, ${total.dudoso} dudosos.`
        : "No hay carnets pendientes para validar con IA.",
      total.processed ? "success" : "info",
    );
    setAiBusy(false);
    await loadPending();
    await loadAiStats();
  }

  async function openDocument(href: string) {
    try {
      const res = await fetch(href, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok || !data.url) {
        showToast(data.error ?? "No se pudo abrir el documento.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      showToast("Error de red al abrir el documento.");
    }
  }

  async function review(profileId: string, action: "approve" | "reject") {
    if (action === "approve" && !carnetMatches[profileId]) {
      showToast(
        "Marca la casilla: la fecha de nacimiento coincide con el carnet, antes de aprobar.",
      );
      return;
    }

    const reason =
      action === "reject"
        ? window.prompt("Motivo del rechazo (visible para el usuario):")
        : null;

    if (action === "reject" && !reason?.trim()) return;

    setBusyId(profileId);

    const response = await fetch(`/api/admin/verification/${profileId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: reason?.trim(),
        carnetBirthDateMatches: carnetMatches[profileId] === true,
      }),
    });
    const data = await response.json();

    setBusyId("");
    if (!response.ok) {
      showToast(data.error ?? "No se pudo completar la revisión.");
      return;
    }

    await loadPending();
    await loadAiStats();
    showToast(action === "approve" ? "Verificación aprobada." : "Verificación rechazada.", "success");
  }

  return (
    <Protected>
      <RoleGuard allowedRoles={["admin"]} showRoleBanner={false}>
        <main className="simplePage">
          {toast && (
            <FloatingToast
              message={toast.message}
              tone={toast.tone}
              seconds={10}
              onClose={clearToast}
            />
          )}
          <section className="formPageCard paymentsPage">
            <div className="eyebrow">
              <ShieldCheck size={16} /> Verificación ZOVIT
            </div>
            <h1>Revisión de identidad</h1>
            <p className="muted">
              La IA lee el carnet automáticamente. Solo revisas casos dudosos o fallos.
            </p>

            <div className="workerAdminAiBar">
              <div>
                <strong>Validación automática de carnet (OCR local)</strong>
                <p className="muted">
                  Cola: {aiStats?.pending ?? "—"} sin OCR · {aiStats?.dudosos ?? "—"} dudosos
                  {lastAiBatch ? ` · Último lote: ${lastAiBatch.processed}` : ""}
                </p>
              </div>
              <div className="workerAdminAiActions">
                <button
                  type="button"
                  className="primaryButton"
                  disabled={aiBusy}
                  onClick={() => void processAiQueue(false)}
                >
                  <Bot size={18} />
                  {aiBusy ? "Procesando…" : "Procesar cola con OCR"}
                </button>
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={aiBusy}
                  onClick={() => void processAiQueue(true)}
                >
                  Reintentar dudosos
                </button>
              </div>
            </div>

            {pending.length === 0 ? (
              <p className="muted">No hay verificaciones pendientes.</p>
            ) : (
              <div className="verificationAdminList">
                {pending.map((item) => {
                  const fullName =
                    [item.first_name, item.last_name].filter(Boolean).join(" ") || item.id;
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
                        <p className="verificationBirthCheck">
                          Fecha declarada del carnet:{" "}
                          <strong>
                            {item.birth_date ? isoToChileanDate(String(item.birth_date)) : "—"}
                          </strong>
                          {item.birth_date_carnet_confirmed ? " · confirmada por el usuario" : ""}
                        </p>
                        <p className="muted">
                          IA: {aiLabel(item.identity_ai_status)}
                          {item.identity_ai_confidence != null
                            ? ` · confianza ${(Number(item.identity_ai_confidence) * 100).toFixed(0)}%`
                            : ""}
                          {item.identity_ai_extracted_rut
                            ? ` · RUT leído ${item.identity_ai_extracted_rut}`
                            : ""}
                          {item.identity_ai_extracted_birth_date
                            ? ` · fecha leída ${isoToChileanDate(String(item.identity_ai_extracted_birth_date))}`
                            : ""}
                        </p>
                        {item.identity_ai_summary ? (
                          <p className="muted">Resumen IA: {item.identity_ai_summary}</p>
                        ) : null}
                        <label className="checkboxRow">
                          <input
                            type="checkbox"
                            checked={carnetMatches[item.id] === true}
                            onChange={(event) =>
                              setCarnetMatches((prev) => ({
                                ...prev,
                                [item.id]: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            Corroboro que esta fecha coincide con la impresa en el carnet subido y
                            que es mayor de 18 años.
                          </span>
                        </label>
                      </div>

                      <div className="verificationAdminDocs">
                        <div className="verificationAdminDocsHead">
                          <span>Documento</span>
                          <span>Acción</span>
                        </div>
                        {item.documents.map((doc) => {
                          const meta = doc.metadata as Record<string, unknown> | null;
                          const href = `/api/admin/verification/${item.id}/file/${doc.id}`;
                          return (
                            <div className="verificationAdminDoc" key={doc.id}>
                              <div className="verificationAdminDocLabel">
                                <span>{IDENTITY_DOCUMENT_LABELS[doc.document_type]}</span>
                                {typeof meta?.challengeCode === "string" && meta.challengeCode && (
                                  <small className="verificationMeta">
                                    Código prueba de vida: {meta.challengeCode}
                                  </small>
                                )}
                                {typeof meta?.challengeInstruction === "string" &&
                                  meta.challengeInstruction && (
                                    <small className="verificationMeta">
                                      {meta.challengeInstruction}
                                    </small>
                                  )}
                              </div>
                              <button
                                type="button"
                                className="linkButton verificationAdminDocAction"
                                onClick={() => void openDocument(href)}
                              >
                                Ver
                              </button>
                            </div>
                          );
                        })}
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
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
