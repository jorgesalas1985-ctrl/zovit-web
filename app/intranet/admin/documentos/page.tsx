"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type OcrQueueItem = {
  documentId: string;
  profileId: string;
  documentKind: string;
  status: string;
  mimeType: string | null;
  semesterYear: number;
  semester: "S1" | "S2";
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
  actionLabel: string;
  requiresHumanAction: boolean;
};

type OcrQueue = {
  items: OcrQueueItem[];
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  error: string | null;
};

type Detail = {
  document: {
    documentId: string;
    profileId: string;
    documentKind: string;
    status: string;
    storageBucket: string;
    storagePath: string;
    originalName: string | null;
    mimeType: string | null;
    fileSizeBytes: number | null;
    semesterYear: number;
    semester: "S1" | "S2";
    extractedData: Record<string, unknown>;
    extractedFields: Array<{ label: string; value: string }>;
    validationSummary: Record<string, unknown>;
    ocrEngine: string | null;
    ocrProcessedAt: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
    reviewHint: string;
    canDecide: boolean;
    submittedAt: string;
    updatedAt: string;
  } | null;
  events: Array<{
    eventId: string;
    eventType: string;
    actorType: string;
    summary: string;
    createdAt: string;
  }>;
  error: string | null;
};

const priorityLabels = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
} as const;

const documentEventTypeLabels: Record<string, string> = {
  submitted: "Ingresado",
  replaced: "Reemplazado",
  ocr_requested: "OCR solicitado",
  ocr_completed: "OCR completado",
  manual_review_requested: "Revision manual",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Vencido",
  semester_renewal_reminder: "Recordatorio",
  semester_suspension_ready: "Listo para suspension",
};

export default function IntranetOperationalDocumentsPage() {
  const [queue, setQueue] = useState<OcrQueue | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadQueue() {
    const response = await fetch("/api/intranet/operations/documents/ocr-queue?limit=50", {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar la cola documental.");
      return;
    }

    setQueue(data.queue ?? null);
  }

  async function loadDetail(documentId: string) {
    setSelectedId(documentId);
    setMessage("");
    const response = await fetch(
      `/api/intranet/operations/documents/detail?documentId=${encodeURIComponent(documentId)}`,
      { cache: "no-store" },
    );
    const data = await response.json();

    if (!response.ok) {
      setDetail(null);
      setMessage(data.detail?.error ?? data.error ?? "No se pudo cargar el documento.");
      return;
    }

    setDetail(data.detail ?? null);
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function decide(action: "approve" | "reject") {
    if (!selectedId) return;
    const reason =
      action === "reject"
        ? window.prompt("Motivo del rechazo documental:")
        : window.prompt("Nota interna opcional para la aprobacion:");

    if (action === "reject" && !reason?.trim()) return;

    setBusy(true);
    setMessage("");
    const response = await fetch("/api/intranet/operations/documents/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: selectedId,
        action,
        reason: action === "reject" ? reason?.trim() : null,
        notes: action === "approve" ? reason?.trim() : null,
      }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error ?? "No se pudo registrar la decision documental.");
      return;
    }

    const decisionSummary =
      data.result?.summary ??
      (action === "approve" ? "Documento aprobado." : "Documento rechazado.");
    const effectsSummary =
      typeof data.effects?.summary === "string" ? data.effects.summary : "";
    setMessage([decisionSummary, effectsSummary].filter(Boolean).join(" "));
    await loadQueue();
    await loadDetail(selectedId);
  }

  async function openDocumentFile() {
    if (!selectedId) return;

    setMessage("");
    const response = await fetch(
      `/api/intranet/operations/documents/file?documentId=${encodeURIComponent(selectedId)}`,
      { cache: "no-store" },
    );
    const data = await response.json();

    if (!response.ok || !data.url) {
      setMessage(data.error ?? "No se pudo abrir el archivo documental.");
      return;
    }

    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  const selectedCanDecide = detail?.document?.canDecide === true;

  return (
    <IntranetGuard allowedRoles={["hr_admin", "supervisor", "super_admin"]}>
      <IntranetShell
        wide
        title="Revision documental operativa"
        description="Revisa documentos semestrales, datos OCR locales y decisiones manuales sin reprocesar archivos."
        kicker="DOCUMENTOS"
        headerAction={
          <Link href="/intranet/admin/centro-control" className="secondaryButton">
            Centro de Control
          </Link>
        }
      >
        <div className="workerAdminAiBar">
          <div>
            <strong>Cola documental gratuita</strong>
            <p className="muted">
              Los documentos se procesan una vez. OCR local extrae datos cuando aplica; los casos
              dudosos quedan para decision humana.
            </p>
            <p className="muted">
              Total: {queue?.total ?? 0} · Criticos: {queue?.critical ?? 0} · Altos:{" "}
              {queue?.high ?? 0}
            </p>
          </div>
          <div className="workerAdminAiActions">
            <button
              type="button"
              className="secondaryButton"
              disabled={busy}
              onClick={() => void loadQueue()}
            >
              <ListChecks size={18} />
              Actualizar
            </button>
          </div>
        </div>

        {message ? <div className="notice">{message}</div> : null}
        {queue?.error ? <div className="notice">{queue.error}</div> : null}

        <div className="workerAdminLayout">
          <div className="workerAdminList">
            {(queue?.items ?? []).map((item) => (
              <button
                key={item.documentId}
                type="button"
                className={`workerAdminRow ${selectedId === item.documentId ? "isActive" : ""}`}
                onClick={() => void loadDetail(item.documentId)}
              >
                {item.priority === "critical" ? (
                  <ShieldAlert size={18} />
                ) : (
                  <FileText size={18} />
                )}
                <span>
                  <strong>{item.documentKind}</strong>
                  <small>
                    {item.status} · {priorityLabels[item.priority]} · {item.semesterYear}-
                    {item.semester}
                  </small>
                  <small>{item.reason}</small>
                  <small>Accion: {item.actionLabel}</small>
                </span>
              </button>
            ))}
            {!queue?.items?.length ? (
              <p className="muted">No hay documentos pendientes en cola OCR/manual.</p>
            ) : null}
          </div>

          <div className="workerAdminDetail">
            {!detail?.document ? (
              <p className="muted">Selecciona un documento para revisar datos y eventos.</p>
            ) : (
              <>
                <h2>{detail.document.documentKind}</h2>
                <p className="muted">
                  Estado {detail.document.status} · Semestre {detail.document.semesterYear}-
                  {detail.document.semester}
                </p>

                <div className="notice workerPanelNotice">
                  {detail.document.reviewHint}
                </div>

                <h3>Archivo</h3>
                <ul className="workerAdminCredList">
                  <li>
                    <div>
                      <strong>{detail.document.originalName ?? "Documento operacional"}</strong>
                      <small>
                        {detail.document.mimeType ?? "Sin tipo"} ·{" "}
                        {detail.document.fileSizeBytes ?? 0} bytes
                      </small>
                      <small>{detail.document.storagePath}</small>
                    </div>
                    <div className="workerAdminActions">
                      <button
                        type="button"
                        className="secondaryButton"
                        disabled={busy}
                        onClick={() => void openDocumentFile()}
                      >
                        <FileText size={16} />
                        Ver archivo
                      </button>
                    </div>
                  </li>
                </ul>

                <h3>OCR y validacion</h3>
                <ul className="workerAdminCredList">
                  <li>
                    <div>
                      <strong>{detail.document.ocrEngine ?? "Sin OCR procesado"}</strong>
                      <small>
                        Procesado:{" "}
                        {detail.document.ocrProcessedAt
                          ? new Date(detail.document.ocrProcessedAt).toLocaleString("es-CL")
                          : "pendiente"}
                      </small>
                    </div>
                  </li>
                  <li>
                    <div>
                      <strong>Datos extraidos</strong>
                      {detail.document.extractedFields.length ? (
                        detail.document.extractedFields.map((field) => (
                          <small key={field.label}>
                            {field.label}: {field.value}
                          </small>
                        ))
                      ) : (
                        <small>Sin datos estructurados extraidos.</small>
                      )}
                      <small>{JSON.stringify(detail.document.extractedData)}</small>
                    </div>
                  </li>
                  <li>
                    <div>
                      <strong>Resumen de validacion</strong>
                      <small>{JSON.stringify(detail.document.validationSummary)}</small>
                    </div>
                  </li>
                </ul>

                <h3>Decision</h3>
                <div className="workerAdminActions">
                  <button
                    type="button"
                    className="primaryButton"
                    disabled={busy || !selectedCanDecide}
                    onClick={() => void decide("approve")}
                  >
                    <ClipboardCheck size={16} />
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className="dangerButton"
                    disabled={busy || !selectedCanDecide}
                    onClick={() => void decide("reject")}
                  >
                    <AlertTriangle size={16} />
                    Rechazar
                  </button>
                </div>
                {!selectedCanDecide ? (
                  <p className="muted">Este documento ya tiene una decision final o fue reemplazado.</p>
                ) : null}

                <h3>Eventos</h3>
                <ul className="workerAdminHistory">
                  {detail.events.map((event) => (
                    <li key={event.eventId}>
                      {documentEventTypeLabels[event.eventType] ?? event.eventType} ·{" "}
                      {event.actorType} ·{" "}
                      {new Date(event.createdAt).toLocaleString("es-CL")} · {event.summary}
                    </li>
                  ))}
                  {!detail.events.length ? <li className="muted">Sin eventos registrados.</li> : null}
                </ul>
              </>
            )}
          </div>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
