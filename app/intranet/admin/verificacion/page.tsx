"use client";

import { AutomationTicker } from "@/components/automation/AutomationTicker";
import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { SuperAdminReviewButton } from "@/components/superadmin/SuperAdminReviewButton";
import { FloatingToast } from "@/components/ui/FloatingToast";
import {
  IDENTITY_DOCUMENT_LABELS,
  type PendingVerificationUser,
} from "@/lib/verification/types";
import { isoToChileanDate } from "@/lib/ui/chileanDate";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  if (status === "pending") return "en cola OCR";
  return status;
}

export default function IntranetVerificationPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando verificación…</p>}>
      <IntranetVerificationPageInner />
    </Suspense>
  );
}

function IntranetVerificationPageInner() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
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
    const response = await fetch("/api/intranet/verification", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error ?? "No se pudo cargar la cola de verificación.");
      return;
    }
    setPending(data.pending ?? []);
  }

  async function loadAiStats() {
    const response = await fetch("/api/intranet/verification/ai-validate", { cache: "no-store" });
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

  useEffect(() => {
    if (!focusId || pending.length === 0) return;
    const el = document.getElementById(`verification-user-${focusId}`);
    if (!el) {
      showToast(
        "Esta cuenta no está en la cola pendiente (puede estar aprobada, rechazada o sin documentos).",
        "info",
      );
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("verificationAdminCardFocus");
    const timer = window.setTimeout(() => el.classList.remove("verificationAdminCardFocus"), 8000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, pending]);

  async function processAiQueue(includeDudosos = false) {
    setAiBusy(true);
    let total: AiBatchResult = { processed: 0, approved: 0, rejected: 0, dudoso: 0 };
    let guard = 0;

    while (guard < 10) {
      guard += 1;
      const response = await fetch("/api/intranet/verification/ai-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 8, includeDudosos: includeDudosos && guard === 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error ?? "No se pudo procesar la cola con OCR.");
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
        ? `OCR proceso ${total.processed}: ${total.approved} aprobados, ${total.rejected} rechazados, ${total.dudoso} dudosos.`
        : "No hay carnets pendientes para validar con OCR. Si una cuenta acaba de registrarse, debe confirmar el correo e ingresar para enviar sus documentos.",
      total.processed ? "success" : "info",
    );
    setAiBusy(false);
    await loadPending();
    await loadAiStats();
  }

  async function reviewWithAi(profileId: string) {
    setAiBusy(true);
    const response = await fetch("/api/intranet/verification/ai-validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    const data = await response.json();
    setAiBusy(false);
    if (!response.ok) {
      showToast(data.error ?? "No se pudo revisar con OCR.");
      await loadAiStats();
      return;
    }
    showToast(`OCR: ${data.decision} - ${data.summary ?? ""}`, "success");
    await loadPending();
    await loadAiStats();
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

    const response = await fetch(`/api/intranet/verification/${profileId}`, {
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
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        wide
        title="Verificación de identidad"
        description="OCR local lee el carnet y aprueba/rechaza sola. Solo revisas los dudosos o fallos."
        kicker="REVISIÓN AUTOMÁTICA"
        headerAction={<SuperAdminReviewButton />}
      >
        {toast && (
          <FloatingToast
            message={toast.message}
            tone={toast.tone}
            seconds={10}
            onClose={clearToast}
          />
        )}

        <AutomationTicker />
        <div className="workerAdminAiBar">
          <div>
            <strong>Validación automática de carnet (OCR local)</strong>
            <p className="muted">
              Extrae RUT y fecha de nacimiento del carnet sin OpenAI ni Gemini, compara con lo
              declarado y aprueba si coincide y es mayor de 18. Los dudosos quedan para revisión
              humana.
            </p>
            <p className="muted">
              Cola: {aiStats?.pending ?? "—"} sin OCR · {aiStats?.dudosos ?? "—"} dudosos
              {lastAiBatch ? ` · Último lote: ${lastAiBatch.processed} procesados` : ""}
            </p>
          </div>
          <div className="workerAdminAiActions">
            <button
              type="button"
              className="primaryButton"
              disabled={aiBusy}
              onClick={() => void processAiQueue(false)}
            >
              <ClipboardCheck size={18} />
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

        <div className="eyebrow">
          <ShieldCheck size={16} /> Cola humana (dudosos / pendientes)
        </div>

        {pending.length === 0 ? (
          <p className="muted">
            No hay verificaciones pendientes. Las cuentas nuevas aparecen aqui cuando el usuario confirma
            su correo, ingresa y ZOVIT recibe sus documentos biometricos.
          </p>
        ) : (
          <div className="verificationAdminList">
            {pending.map((item) => {
              const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ") || item.id;
              return (
                <article
                  className="verificationAdminCard"
                  id={`verification-user-${item.id}`}
                  key={item.id}
                >
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
                      OCR: {aiLabel(item.identity_ai_status)}
                      {item.identity_ai_confidence != null
                        ? ` · confianza ${(Number(item.identity_ai_confidence) * 100).toFixed(0)}%`
                        : ""}
                      {item.identity_ai_forgery_risk
                        ? ` · riesgo ${item.identity_ai_forgery_risk}`
                        : ""}
                      {item.identity_ai_extracted_rut
                        ? ` · RUT leído ${item.identity_ai_extracted_rut}`
                        : ""}
                      {item.identity_ai_extracted_birth_date
                        ? ` · fecha leída ${isoToChileanDate(String(item.identity_ai_extracted_birth_date))}`
                        : ""}
                    </p>
                    {item.identity_ai_summary ? (
                      <p className="muted">Resumen OCR: {item.identity_ai_summary}</p>
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
                        Corroboro que esta fecha coincide con la impresa en el carnet subido y que es
                        mayor de 18 años.
                      </span>
                    </label>
                  </div>

                  <div className="verificationAdminDocs">
                    {item.documents.length === 0 ? (
                      <p className="muted" style={{ padding: "12px" }}>
                        Sin documentos adjuntos.
                      </p>
                    ) : (
                      <>
                        <div className="verificationAdminDocsHead">
                          <span>Documento</span>
                          <span>Acción</span>
                        </div>
                        {item.documents.map((doc) => {
                          const meta = doc.metadata as Record<string, unknown> | null;
                          const href = `/api/intranet/verification/${item.id}/file/${doc.id}`;
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
                                onClick={() => {
                                  void (async () => {
                                    try {
                                      const res = await fetch(href, { cache: "no-store" });
                                      const data = (await res.json().catch(() => ({}))) as {
                                        error?: string;
                                        url?: string;
                                      };
                                      if (!res.ok || !data.url) {
                                        showToast(data.error ?? "No se pudo abrir el documento.");
                                        return;
                                      }
                                      window.open(data.url, "_blank", "noopener,noreferrer");
                                    } catch {
                                      showToast("Error de red al abrir el documento.");
                                    }
                                  })();
                                }}
                              >
                                Ver
                              </button>
                            </div>
                          );
                        })}
                      </>
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
                    <button
                      className="linkButton"
                      disabled={aiBusy || busyId === item.id}
                      title="Leer carnet con OCR local"
                      onClick={() => void reviewWithAi(item.id)}
                    >
                      Revisar con OCR
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
