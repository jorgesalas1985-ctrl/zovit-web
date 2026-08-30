"use client";

import { AutomationTicker } from "@/components/automation/AutomationTicker";
import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { SuperAdminReviewButton } from "@/components/superadmin/SuperAdminReviewButton";
import { FloatingToast } from "@/components/ui/FloatingToast";
import {
  IDENTITY_DOCUMENT_LABELS,
  type IdentityDocument,
  type PendingVerificationUser,
} from "@/lib/verification/types";
import { isAdultInChile } from "@/lib/registration/age";
import { isoToChileanDate } from "@/lib/ui/chileanDate";
import { chileanDateToIso } from "@/lib/ui/chileanDate";
import { CircleX, ClipboardCheck, Eye, Minus, Plus, ShieldCheck, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";

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
type OpenDocument = { id: string; label: string; url: string; fileName: string };
const documentOrder: Record<string, number> = { cedula_front: 1, cedula_back: 2, selfie: 3, liveness_proof: 4, certificado_estudios: 5, certificado_antecedentes: 6 };
const orderedDocuments = (documents: IdentityDocument[]) => [...documents].sort((a, b) => (documentOrder[a.document_type] ?? 100) - (documentOrder[b.document_type] ?? 100) || a.created_at.localeCompare(b.created_at));
const REQUIRED_IDENTITY_DOCUMENTS = ["cedula_front", "cedula_back", "selfie", "liveness_proof"] as const;

function hasAllRequiredDocumentsReviewed(item: PendingVerificationUser) {
  return REQUIRED_IDENTITY_DOCUMENTS.every((documentType) =>
    item.documents.some((document) => document.document_type === documentType && document.status === "approved"),
  );
}

function aiLabel(status: string | null | undefined) {
  if (!status) return "sin revisar";
  if (status === "dudoso") return "dudoso (revisión humana)";
  if (status === "processing") return "procesando…";
  if (status === "pending") return "en cola OCR";
  return status;
}

function verificationNameTone(status: string | null | undefined) {
  if (status === "approved") return "is-approved";
  if (status === "rejected" || status === "cancelled") return "is-rejected";
  if (status === "dudoso") return "is-dudoso";
  return "is-pending";
}

function hasOcrConfirmedAdultBirthDate(item: PendingVerificationUser) {
  const declaredBirthDate = item.birth_date ? chileanDateToIso(String(item.birth_date)) : null;
  const ocrBirthDate = item.identity_ai_extracted_birth_date
    ? chileanDateToIso(String(item.identity_ai_extracted_birth_date))
    : null;
  return Boolean(
    declaredBirthDate &&
      ocrBirthDate &&
      declaredBirthDate === ocrBirthDate &&
      isAdultInChile(ocrBirthDate) &&
      item.identity_ai_forgery_risk !== "high",
  );
}

/**
 * Solo una confirmación positiva explícita del motor biométrico puede marcar
 * esta etapa automáticamente. La falta de respuesta o una revisión dudosa
 * conserva la casilla manual para la persona administradora.
 */
function hasAutomatedFaceMatch(item: PendingVerificationUser) {
  return item.documents.some((document) => {
    const metadata = document.metadata as Record<string, unknown> | null;
    return metadata?.aiFaceMatchConfirmed === true;
  });
}

function hasManualFaceMatch(item: PendingVerificationUser) {
  return item.documents.some((document) => {
    if (document.document_type !== "selfie") return false;
    const metadata = document.metadata as Record<string, unknown> | null;
    return metadata?.manualFaceMatchConfirmed === true;
  });
}

export default function IntranetVerificationPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando verificación…</p>}>
      <IntranetVerificationPageInner />
    </Suspense>
  );
}

function IntranetVerificationPageInner() {
  const { isRealSuperAdmin } = useSuperAdminView();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const [pending, setPending] = useState<PendingVerificationUser[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [busyId, setBusyId] = useState("");
  const [busyDocumentId, setBusyDocumentId] = useState("");
  const [carnetMatches, setCarnetMatches] = useState<Record<string, boolean>>({});
  const [faceMatches, setFaceMatches] = useState<Record<string, boolean>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStats, setAiStats] = useState<AiQueueStats | null>(null);
  const [lastAiBatch, setLastAiBatch] = useState<AiBatchResult | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [openDocument, setOpenDocument] = useState<OpenDocument | null>(null);
  const [viewedDocumentId, setViewedDocumentId] = useState("");
  const [documentZoom, setDocumentZoom] = useState(100);
  const [resubmissionSelections, setResubmissionSelections] = useState<Record<string, boolean>>({});
  const [resubmissionReason, setResubmissionReason] = useState("");
  const clearToast = useCallback(() => setToast(null), []);

  function showToast(message: string, tone: ToastState["tone"] = "error") {
    setToast({ message, tone });
  }

  const matchesSearch = (item: PendingVerificationUser) => {
    if (!searchTerm) return true;
    const query = searchTerm.toLocaleLowerCase("es-CL").replace(/[^a-z0-9k]/g, "");
    const name = [item.first_name, item.last_name].filter(Boolean).join(" ").toLocaleLowerCase("es-CL");
    const rut = (item.rut ?? "").toLocaleLowerCase("es-CL").replace(/[^a-z0-9k]/g, "");
    return name.includes(searchTerm.toLocaleLowerCase("es-CL")) || rut.includes(query);
  };
  const visiblePending = pending.filter(matchesSearch);
  const currentReviewIndex = Math.min(reviewIndex, Math.max(visiblePending.length - 1, 0));
  const currentPending = visiblePending.slice(currentReviewIndex, currentReviewIndex + 1);

  async function loadPending() {
    const response = await fetch("/api/intranet/verification", { cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json() as { pending?: PendingVerificationUser[]; checked?: PendingVerificationUser[]; error?: string }
      : { error: "El servidor no entregó una respuesta válida para la cola de verificación." };
    if (!response.ok) {
      showToast(data.error ?? "No se pudo cargar la cola de verificación.");
      return;
    }
    setPending(data.pending ?? []);
  }

  async function loadAiStats() {
    const response = await fetch("/api/intranet/verification/ai-validate", { cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return;
    const data = await response.json() as { pending?: number; dudosos?: number; openaiConfigured?: boolean };
    if (!response.ok) return;
    const stats = {
      pending: data.pending ?? 0,
      dudosos: data.dudosos ?? 0,
      openaiConfigured: Boolean(data.openaiConfigured),
    };
    setAiStats(stats);
  }

  async function toggleDocumentReview(profileId: string, documentId: string, checked: boolean) {
    setBusyDocumentId(documentId);
    try {
      const response = await fetch(`/api/intranet/verification/${profileId}/document/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la revisión.");
      await loadPending();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar la revisión.");
    } finally {
      setBusyDocumentId("");
    }
  }

  async function toggleFaceMatch(profileId: string, documentId: string | undefined, checked: boolean) {
    if (!documentId) {
      showToast("Primero debe existir una selfie biométrica para confirmar la comparación facial.");
      return;
    }
    setBusyDocumentId(documentId);
    try {
      const response = await fetch(`/api/intranet/verification/${profileId}/document/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricFaceConfirmed: checked }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la confirmación biométrica.");
      setFaceMatches((previous) => ({ ...previous, [profileId]: checked }));
      await loadPending();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar la confirmación biométrica.");
    } finally {
      setBusyDocumentId("");
    }
  }

  async function viewDocument(profileId: string, document: IdentityDocument) {
    const href = `/api/intranet/verification/${profileId}/file/${document.id}`;
    try {
      const res = await fetch(href, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; fileName?: string };
      if (!res.ok || !data.url) {
        showToast(data.error ?? "No se pudo abrir el documento.");
        return;
      }
      setDocumentZoom(100);
      setViewedDocumentId(document.id);
      setOpenDocument({
        id: document.id,
        label: IDENTITY_DOCUMENT_LABELS[document.document_type],
        url: data.url,
        fileName: data.fileName ?? "documento",
      });
      if (document.status !== "approved") void toggleDocumentReview(profileId, document.id, true);
    } catch {
      showToast("Error de red al abrir el documento.");
    }
  }

  async function requestSelectedResubmissions(item: PendingVerificationUser) {
    const documentIds = item.documents.filter((document) => resubmissionSelections[document.id]).map((document) => document.id);
    if (!documentIds.length) return;
    setBusyDocumentId(item.id);
    try {
      const response = await fetch(`/api/intranet/verification/${item.id}/request-resubmission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds, reason: resubmissionReason }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo solicitar el reenvío.");
      showToast(data.message ?? "Se envió la solicitud de reenvío.", "success");
      setResubmissionReason("");
      await loadPending();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo solicitar el reenvío.");
    } finally {
      setBusyDocumentId("");
    }
  }

  useEffect(() => {
    void loadPending();
    void loadAiStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!focusId || pending.length === 0) return;
    const focusedIndex = pending.findIndex((item) => item.id === focusId);
    if (focusedIndex < 0) {
      showToast(
        "Esta cuenta no está en la cola pendiente (puede estar aprobada, rechazada o sin documentos).",
        "info",
      );
      return;
    }
    setReviewIndex(focusedIndex);
  }, [focusId, pending]);

  async function processAiQueue(includeDudosos = false) {
    setAiBusy(true);
    let total: AiBatchResult = { processed: 0, approved: 0, rejected: 0, dudoso: 0 };
    let guard = 0;

    try {
    while (guard < 10) {
      guard += 1;
      const response = await fetch("/api/intranet/verification/ai-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 8, includeDudosos: includeDudosos && guard === 1 }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? await response.json() : { error: "El servidor no entregó una respuesta válida." };
      if (!response.ok) {
        showToast(data.error ?? "No se pudo procesar la cola con OCR.");
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
    await loadPending();
    await loadAiStats();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "La revisión OCR tardó demasiado o perdió conexión.");
    } finally {
      setAiBusy(false);
    }
  }

  async function reviewWithAi(profileId: string) {
    setAiBusy(true);
    try {
      const response = await fetch("/api/intranet/verification/ai-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await response.json() as { error?: string; decision?: string; summary?: string }
        : { error: "El servidor no entregó una respuesta válida para OCR." };
      if (!response.ok) {
        showToast(data.error ?? "No se pudo revisar con OCR.");
        await loadAiStats();
        return;
      }
      showToast(`OCR: ${data.decision} - ${data.summary ?? ""}`, "success");
      await loadPending();
      await loadAiStats();
    } finally {
      setAiBusy(false);
    }
  }

  async function review(profileId: string, action: "approve" | "reject") {
    const subject = pending.find((item) => item.id === profileId);
    const allDocumentsReviewed = Boolean(subject && hasAllRequiredDocumentsReviewed(subject));
    const birthDateConfirmed = carnetMatches[profileId] === true || Boolean(subject && hasOcrConfirmedAdultBirthDate(subject)) || allDocumentsReviewed;
    const faceConfirmed = faceMatches[profileId] === true || Boolean(subject && (hasAutomatedFaceMatch(subject) || hasManualFaceMatch(subject)));
    if (action === "approve" && !allDocumentsReviewed) {
      showToast(
        "Primero revisa y marca carnet frontal, reverso, selfie y prueba de vida.",
      );
      return;
    }
    if (action === "approve" && !faceConfirmed) {
      showToast("Marca Biometría facial después de comparar la selfie, la prueba de vida y el carnet.");
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
        carnetBirthDateMatches: birthDateConfirmed,
        biometricFaceMatches: faceConfirmed,
      }),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json() as { error?: string }
      : { error: "El servidor no entregó una respuesta válida para la revisión." };

    setBusyId("");
    if (!response.ok) {
      if (response.status === 409) {
        setPending((current) => current.filter((item) => item.id !== profileId));
        await loadPending();
        await loadAiStats();
        if (action === "approve") {
          window.sessionStorage.setItem("zovit-verification-toast", "La identidad ya estaba resuelta. Revísala en Aprobados.");
          router.replace("/intranet/admin/verificacion/aprobados");
          return;
        }
        showToast("Esta identidad ya fue resuelta y se retiró de la cola pendiente. Revísala en Aprobados si corresponde.", "info");
        return;
      }
      showToast(data.error ?? "No se pudo completar la revisión.");
      return;
    }

    setPending((current) => current.filter((item) => item.id !== profileId));
    await loadPending();
    await loadAiStats();
    if (action === "approve") {
      window.sessionStorage.setItem("zovit-verification-toast", "Verificación aprobada correctamente.");
      router.replace("/intranet/admin/verificacion/aprobados");
      return;
    }
    showToast("Verificación rechazada.", "success");
  }

  async function approveWithoutVerification() {
    if (!focusId || !isRealSuperAdmin) return;
    const accepted = window.confirm("Esta acción aprobará la identidad sin OCR ni comprobación documental. Quedará registrada como excepción del superadministrador. ¿Deseas continuar?");
    if (!accepted) return;
    const confirmation = window.prompt('Para confirmar escribe exactamente: APROBAR SIN VERIFICACION');
    if (confirmation !== "APROBAR SIN VERIFICACION") {
      showToast("La aprobación excepcional fue cancelada.", "info");
      return;
    }
    setBusyId(focusId);
    try {
      const response = await fetch("/api/intranet/verification/manual-override", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: focusId, confirmation }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await response.json() as { error?: string }
        : { error: "El servidor no entregó una respuesta válida para la aprobación." };
      if (!response.ok) throw new Error(data.error ?? "No se pudo aprobar la cuenta.");
      showToast("Cuenta aprobada excepcionalmente por el superadministrador.", "success");
      await loadPending(); await loadAiStats();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo aprobar la cuenta.");
    } finally { setBusyId(""); }
  }

  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        wide
        title="Verificación de identidad"
        description="OCR local lee el carnet y aprueba/rechaza sola. Solo revisas los dudosos o fallos."
        kicker="REVISIÓN AUTOMÁTICA"
        headerAction={
          <div className="verificationHeaderActions">
            <Link className="secondaryButton" href="/intranet/admin/verificacion/aprobados">Aprobados</Link>
            <SuperAdminReviewButton />
          </div>
        }
      >
        {toast && (
          <FloatingToast
            message={toast.message}
            tone={toast.tone}
            seconds={10}
            onClose={clearToast}
          />
        )}

        {openDocument ? (
          <div className="verificationDocumentViewerBackdrop" role="presentation" onMouseDown={() => setOpenDocument(null)}>
            <section
              className="verificationDocumentViewer"
              role="dialog"
              aria-modal="true"
              aria-label={`Revisión de ${openDocument.label}`}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <div><span className="eyebrow">DOCUMENTO ABIERTO</span><h2>{openDocument.label}</h2></div>
                <div className="verificationDocumentViewerActions">
                  <button type="button" className="secondaryButton" onClick={() => setDocumentZoom((value) => Math.max(50, value - 25))} aria-label="Alejar documento"><Minus size={18} /></button>
                  <span>{documentZoom}%</span>
                  <button type="button" className="secondaryButton" onClick={() => setDocumentZoom((value) => Math.min(250, value + 25))} aria-label="Acercar documento"><Plus size={18} /></button>
                  <button type="button" className="iconButton" onClick={() => setOpenDocument(null)} aria-label="Cerrar visor"><X size={21} /></button>
                </div>
              </header>
              <p className="muted">Este documento ya quedó marcado como revisado. Usa el zoom para comprobar los datos antes de aprobar la identidad.</p>
              <div className="verificationDocumentViewerCanvas">
                {/\.(jpe?g|png|webp|gif|avif|heic)$/i.test(openDocument.fileName) ? (
                  <img src={openDocument.url} alt={openDocument.label} style={{ width: `${documentZoom}%` }} />
                ) : /\.(mp4|webm|mov)$/i.test(openDocument.fileName) ? (
                  <video controls src={openDocument.url} aria-label={openDocument.label} />
                ) : (
                  <iframe title={openDocument.label} src={`${openDocument.url}#zoom=${documentZoom}`} />
                )}
              </div>
            </section>
          </div>
        ) : null}

        <AutomationTicker />
        {isRealSuperAdmin && focusId ? (
          <div className="workerAdminAiBar">
            <div><strong>Aprobación excepcional</strong><p className="muted">Permite aprobar la cuenta seleccionada sin OCR. La acción queda identificada como decisión exclusiva del superadministrador.</p></div>
            <button type="button" className="secondaryButton" disabled={busyId === focusId} onClick={() => void approveWithoutVerification()}>
              {busyId === focusId ? "Aprobando…" : "Aprobar sin verificación"}
            </button>
          </div>
        ) : null}
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

        <form
          className="verificationSearch"
          onSubmit={(event) => {
            event.preventDefault();
            setSearchTerm(searchDraft.trim());
            setReviewIndex(0);
          }}
        >
          <label htmlFor="verification-search">Buscar una persona</label>
          <div>
            <input
              id="verification-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Nombre o RUT"
            />
            <button type="submit" className="primaryButton">Buscar</button>
            {searchTerm ? <button type="button" className="secondaryButton" onClick={() => { setSearchDraft(""); setSearchTerm(""); setReviewIndex(0); }}>Limpiar</button> : null}
          </div>
        </form>

        {visiblePending.length === 0 ? (
          <p className="muted">
            {searchTerm ? "No se encontró una persona con ese nombre o RUT." : "No hay verificaciones pendientes. Las cuentas nuevas aparecen aquí cuando el usuario confirma su correo, ingresa y ZOVIT recibe sus documentos biométricos."}
          </p>
        ) : (
          <div className="verificationAdminList verificationAdminListSingle">
            <div className="verificationReviewPager" aria-live="polite">
              <strong>Revisión {currentReviewIndex + 1} de {visiblePending.length}</strong>
              <div className="verificationReviewPagerActions">
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={currentReviewIndex === 0}
                  onClick={() => setReviewIndex((index) => Math.max(index - 1, 0))}
                >
                  Revisión anterior
                </button>
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={currentReviewIndex >= visiblePending.length - 1}
                  onClick={() => setReviewIndex((index) => Math.min(index + 1, visiblePending.length - 1))}
                >
                  {currentReviewIndex >= visiblePending.length - 1 ? "Última revisión" : "Siguiente revisión"}
                </button>
              </div>
            </div>
            {currentPending.map((item) => {
              const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ") || item.id;
              const allDocumentsReviewed = hasAllRequiredDocumentsReviewed(item);
              const birthDateConfirmedByOcr = hasOcrConfirmedAdultBirthDate(item);
              const birthDateConfirmed = carnetMatches[item.id] === true || birthDateConfirmedByOcr || allDocumentsReviewed;
              const faceConfirmedByAutomation = hasAutomatedFaceMatch(item);
              const faceConfirmedManually = hasManualFaceMatch(item);
              const faceConfirmed = faceMatches[item.id] === true || faceConfirmedByAutomation || faceConfirmedManually;
              const biometricDocuments = orderedDocuments(item.documents).filter(
                (doc) => doc.document_type === "selfie",
              );
              const listedDocuments = orderedDocuments(item.documents).filter(
                (doc) => doc.document_type !== "selfie",
              );
              const manualReviewComplete =
                allDocumentsReviewed && birthDateConfirmed && faceConfirmed;
              return (
                <article
                  className={`verificationAdminCard verificationAdminCard--${item.identity_ai_status ?? "pending"}`}
                  id={`verification-user-${item.id}`}
                  key={item.id}
                >
                  <div className="verificationAdminIdentity">
                    <div className="verificationAdminStatus"><ShieldCheck size={18} /> OCR: {manualReviewComplete && item.identity_ai_status === "dudoso" ? "dudoso (revisión manual completada)" : aiLabel(item.identity_ai_status)}</div>
                    {item.identity_ai_status === "dudoso" ? (
                      <div className={`verificationHumanReviewBanner ${manualReviewComplete ? "isComplete" : ""}`}>
                        {manualReviewComplete ? "Revisión humana completada · puedes aprobar la identidad" : "Revisión humana requerida"}
                      </div>
                    ) : null}
                    <table className="verificationAdminData" aria-label={`Datos de ${fullName}`}>
                      <tbody>
                        <tr><th scope="row">Nombre</th><td className={`verificationPersonName ${verificationNameTone(item.identity_ai_status)}`}>{fullName}</td></tr>
                        <tr><th scope="row">RUT</th><td>{item.rut ?? "No informado"}</td></tr>
                        <tr><th scope="row">Cuenta</th><td>{item.role}</td></tr>
                        <tr><th scope="row">Fecha enviada</th><td>{item.identity_submitted_at ? new Date(item.identity_submitted_at).toLocaleString("es-CL") : "—"}</td></tr>
                        <tr><th scope="row">Fecha del carnet</th><td>{item.birth_date ? isoToChileanDate(String(item.birth_date)) : "No informada"}</td></tr>
                        <tr><th scope="row">Resultado OCR</th><td>{item.identity_ai_summary ?? "Pendiente de procesamiento."}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="verificationAdminDocs">
                    <table className="verificationDocumentsTable" aria-label={`Documentos de ${fullName}`}>
                      <thead>
                        <tr><th>Documentos</th><th>Estado</th><th>Ver</th><th>Reenviar</th></tr>
                      </thead>
                      <tbody>
                        <tr className="verificationDocumentRequirement">
                          <td>1. Confirmación de mayoría de edad</td>
                          <td>
                            <label className="verificationDocumentCheck">
                              <input
                                type="checkbox"
                                checked={birthDateConfirmed}
                                disabled={birthDateConfirmedByOcr}
                                onChange={(event) =>
                                  setCarnetMatches((prev) => ({ ...prev, [item.id]: event.target.checked }))
                                }
                              />
                              <span>{birthDateConfirmedByOcr ? "Validado por OCR" : allDocumentsReviewed ? "Revisado" : birthDateConfirmed ? "Revisado" : "Pendiente"}</span>
                            </label>
                          </td>
                          <td>—</td>
                          <td>—</td>
                        </tr>
                        <tr className="verificationDocumentRequirement">
                          <td>2. Biometría facial (selfie)</td>
                          <td>
                            <label className="verificationDocumentCheck">
                              <input
                                type="checkbox"
                                checked={faceConfirmed}
                                disabled={faceConfirmedByAutomation || busyDocumentId === biometricDocuments[0]?.id}
                                onChange={(event) =>
                                  void toggleFaceMatch(item.id, biometricDocuments[0]?.id, event.target.checked)
                                }
                              />
                              <span>{faceConfirmedByAutomation ? "Validado automáticamente" : faceConfirmedManually || faceMatches[item.id] ? "Comparado" : "Confirmar"}</span>
                            </label>
                          </td>
                          <td>
                            {biometricDocuments.length ? (
                              <div className="verificationBiometricLinks">
                                {biometricDocuments.map((document) => (
                                  <button
                                    type="button"
                                    className={`linkButton verificationAdminDocAction ${viewedDocumentId === document.id ? "isViewed" : ""}`}
                                    key={document.id}
                                    onClick={() => void viewDocument(item.id, document)}
                                    aria-label="Ver selfie biométrica"
                                    title="Ver selfie biométrica"
                                  >
                                    <Eye size={19} aria-hidden="true" />
                                  </button>
                                ))}
                              </div>
                            ) : "—"}
                          </td>
                          <td>—</td>
                        </tr>
                        {listedDocuments.length === 0 ? (
                          <tr><td colSpan={4}>Sin documentos adjuntos.</td></tr>
                        ) : listedDocuments.map((doc, documentIndex) => {
                          const isReviewed = doc.status === "approved";
                          const documentNumber = documentIndex + 3;
                          const metadata = doc.metadata as Record<string, unknown> | null;
                          const invalidChileanId =
                            (doc.document_type === "cedula_front" || doc.document_type === "cedula_back") &&
                            metadata?.aiDocumentLooksLikeChileanId === false;
                          const invalidChileanIdReason = Array.isArray(metadata?.aiDocumentReasons)
                            ? metadata.aiDocumentReasons.filter((reason): reason is string => typeof reason === "string").join(" · ")
                            : "OCR no reconoce estructura de cédula chilena.";
                          return (
                            <tr key={`table-${doc.id}`}>
                              <td className="verificationDocumentTitle">{documentNumber}. {IDENTITY_DOCUMENT_LABELS[doc.document_type]}</td>
                              <td>
                                <div className="verificationDocumentStatus">
                                  <label className="verificationDocumentCheck">
                                    <input
                                      type="checkbox"
                                      checked={isReviewed}
                                      disabled={busyDocumentId === doc.id || item.identity_ai_status === "approved"}
                                      onChange={(event) => void toggleDocumentReview(item.id, doc.id, event.target.checked)}
                                    />
                                    <span>{isReviewed ? "Revisado" : "Pendiente"}</span>
                                  </label>
                                  {invalidChileanId ? (
                                    <span className="verificationDocumentAiFail" title={invalidChileanIdReason}>
                                      <CircleX size={18} aria-hidden="true" /> No es cédula
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={`linkButton verificationAdminDocAction ${viewedDocumentId === doc.id ? "isViewed" : ""}`}
                                  onClick={() => void viewDocument(item.id, doc)}
                                  aria-label={`Ver ${IDENTITY_DOCUMENT_LABELS[doc.document_type]}`}
                                  title={`Ver ${IDENTITY_DOCUMENT_LABELS[doc.document_type]}`}
                                >
                                  <Eye size={19} aria-hidden="true" />
                                </button>
                              </td>
                              <td>
                                <label className="verificationResubmissionCheck">
                                  <input type="checkbox" checked={resubmissionSelections[doc.id] === true} onChange={(event) => setResubmissionSelections((current) => ({ ...current, [doc.id]: event.target.checked }))} />
                                  <span>Solicitar</span>
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="muted verificationFaceNotice">
                      La biometría ZOVIT básica es una revisión humana asistida: compara visualmente carnet, selfie y prueba de vida.
                    </p>
                    <details className="verificationRawDetails verificationDocumentDetails">
                      <summary>Datos detallados del análisis de documentos</summary>
                      <table className="verificationAdminData verificationAdminDetailsTable" aria-label={`Datos OCR detallados de ${fullName}`}>
                        <tbody>
                          <tr><th scope="row">Estado OCR</th><td>{aiLabel(item.identity_ai_status)}</td></tr>
                          <tr><th scope="row">Fecha confirmada</th><td>{item.birth_date_carnet_confirmed ? "Sí, confirmada por el usuario" : "Sin confirmar"}</td></tr>
                          <tr><th scope="row">Confianza OCR</th><td>{item.identity_ai_confidence != null ? `${(Number(item.identity_ai_confidence) * 100).toFixed(0)}%` : "No disponible"}</td></tr>
                          <tr><th scope="row">Riesgo de fraude</th><td>{item.identity_ai_forgery_risk ?? "No evaluado"}</td></tr>
                          <tr><th scope="row">RUT leído por OCR</th><td>{item.identity_ai_extracted_rut ?? "No detectado"}</td></tr>
                          <tr><th scope="row">Fecha leída por OCR</th><td>{item.identity_ai_extracted_birth_date ? isoToChileanDate(String(item.identity_ai_extracted_birth_date)) : "No detectada"}</td></tr>
                          <tr><th scope="row">Resumen OCR</th><td>{item.identity_ai_summary ?? "Sin resultado disponible."}</td></tr>
                        </tbody>
                      </table>
                    </details>
                    {listedDocuments.length === 0 ? (
                      <p className="muted" style={{ padding: "12px" }}>
                        Sin documentos adjuntos.
                      </p>
                    ) : (
                      <>
                        <div className="verificationAdminDocsHead">
                          <span>Documento</span>
                          <span>Acción</span>
                        </div>
                        {listedDocuments.map((doc) => {
                          const meta = doc.metadata as Record<string, unknown> | null;
                          const isReviewed = doc.status === "approved";
                          return (
                            <div className={`verificationAdminDoc ${isReviewed ? "isReviewed" : ""}`} key={doc.id}>
                              <div className="verificationAdminDocLabel">
                                <span className="verificationDocumentState"><ShieldCheck size={16} /> {IDENTITY_DOCUMENT_LABELS[doc.document_type]} · cargado</span>
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
                                className={`linkButton verificationAdminDocAction ${viewedDocumentId === doc.id ? "isViewed" : ""}`}
                              onClick={() => void viewDocument(item.id, doc)}
                              >
                                Ver
                              </button>
                            </div>
                          );
                        })}
                      </>
                    )}
                    {item.documents.length > 0 ? (
                      <div className="verificationResubmissionActions">
                        <label>
                          <span>Motivo para el usuario</span>
                          <input value={resubmissionReason} onChange={(event) => setResubmissionReason(event.target.value)} placeholder="Ej.: La foto está borrosa o incompleta." />
                        </label>
                        <button type="button" className="secondaryButton verificationResubmissionButton" disabled={busyDocumentId === item.id || !item.documents.some((document) => resubmissionSelections[document.id])} onClick={() => void requestSelectedResubmissions(item)}>
                          {busyDocumentId === item.id ? "Enviando…" : "Enviar solicitud de reenvío"}
                        </button>
                      </div>
                    ) : null}
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
            <div className="verificationReviewPager verificationReviewPagerBottom" aria-hidden="true">
              <span>Revisa esta solicitud antes de continuar.</span>
              <span>{currentReviewIndex >= visiblePending.length - 1 ? "Fin de la cola" : "Continúa con la siguiente cuando termines."}</span>
            </div>
          </div>
        )}

      </IntranetShell>
    </IntranetGuard>
  );
}
