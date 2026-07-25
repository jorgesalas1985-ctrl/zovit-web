"use client";

import { AlertCircle, ArrowRight, CheckCircle2, FileUp, GraduationCap, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/components/AuthProvider";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import {
  hasStudyCertificateDocument,
  IDENTITY_DOCUMENT_LABELS,
  IDENTITY_STATUS_LABELS,
  type IdentityDocumentType,
} from "@/lib/verification/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function VerificationPage() {
  const { user, refreshProfile } = useAuth();
  const { state, message, setMessage, busyType, uploadDocument, submitStudyCertificate, loadState } =
    useIdentityVerification();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [workerDocs, setWorkerDocs] = useState<Array<{ label: string; path: string }>>([]);
  const [importing, setImporting] = useState(false);

  const documentType: IdentityDocumentType = "certificado_estudios";
  const studyStatus = state?.study_verification_status ?? "none";
  const locked = studyStatus === "pending" || studyStatus === "approved";
  const uploaded = state?.documents.find((doc) => doc.document_type === documentType);
  const canSubmit =
    state && !locked && hasStudyCertificateDocument(state.documents);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/verification/certificates/from-worker", {
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.documents)) {
        setWorkerDocs(data.documents);
      }
    })();
  }, []);

  async function handleUpload(file: File) {
    if (!user) return;
    await uploadDocument(user.id, documentType, file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await submitStudyCertificate();
    if (ok) {
      await Promise.all([loadState(), refreshProfile()]);
    }
  }

  async function applyWorkerDocuments() {
    setImporting(true);
    setMessage("");
    const response = await fetch("/api/verification/certificates/from-worker", {
      method: "POST",
    });
    const data = await response.json();
    setImporting(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudieron usar los documentos del registro.");
      return;
    }
    setMessage(data.notice ?? "Documentos del registro aplicados.");
    await Promise.all([loadState(), refreshProfile()]);
  }

  return (
    <Protected>
      <RoleGuard requiredMode="professional">
        <main className="simplePage">
          <section className="formPageCard verificationPage">
            <div className="eyebrow">
              <GraduationCap size={16} /> Verificación ZOVIT
            </div>
            <h1>Verificación gratuita</h1>
            <p className="muted">
              Si ya adjuntaste certificados en el registro de trabajador (botón +), no hace falta
              subirlos otra vez: úsalos aquí con un clic.
            </p>

            {state && (
              <div className="verificationStatusRow">
                <span className={`statusPill status-${studyStatus}`}>
                  {IDENTITY_STATUS_LABELS[studyStatus]}
                </span>
                {state.study_verified && <span className="identityBadge">Estudios verificados</span>}
              </div>
            )}

            <div className="verificationInfoBox">
              <h2>Certificados de estudios</h2>
              <ul>
                <li>Título, diploma, licencia o certificado formal.</li>
                <li>Debe ser legible e incluir institución y fecha.</li>
                <li>Formatos JPG, PNG, WEBP o PDF.</li>
              </ul>
              <p className="muted">
                Esta verificación es gratuita y solo aplica a profesionales. Los clientes no
                necesitan subir certificados.
              </p>
            </div>

            {!locked && workerDocs.length > 0 && (
              <div className="notice workerReuseBox">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Ya tienes {workerDocs.length} documento(s) en tu registro de trabajador.</strong>
                  <p className="muted" style={{ margin: "6px 0 10px" }}>
                    {workerDocs.map((d) => d.label).join(" · ")}
                  </p>
                  <button
                    type="button"
                    className="primaryButton"
                    disabled={importing}
                    onClick={() => void applyWorkerDocuments()}
                  >
                    {importing
                      ? "Aplicando…"
                      : "Usar documentos del registro y enviar verificación"}
                  </button>
                  <p className="muted" style={{ marginTop: 8 }}>
                    También puedes{" "}
                    <Link href="/registro/trabajador">volver al registro</Link> si quieres agregar
                    más con el botón +.
                  </p>
                </div>
              </div>
            )}

            {studyStatus === "approved" && (
              <div className="notice">Tus certificados de estudios ya están verificados.</div>
            )}

            {studyStatus === "pending" && (
              <div className="notice">
                Tu certificado está en revisión. Suele tardar entre 24 y 48 horas.
              </div>
            )}

            {studyStatus === "rejected" && (
              <div className="formMessage">
                <AlertCircle size={17} />
                {state?.study_rejection_reason ?? "Tu certificado fue rechazado. Sube uno nuevo."}
              </div>
            )}

            {message && <div className="notice">{message}</div>}

            {state && !locked && (
              <form className="verificationUploadGrid" onSubmit={handleSubmit}>
                <article className="verificationUploadCard">
                  <div className="verificationUploadHead">
                    <FileUp size={18} />
                    <div>
                      <h3>{IDENTITY_DOCUMENT_LABELS[documentType]}</h3>
                      <p>
                        Opcional si ya usaste los del registro: PDF o foto legible de tu título,
                        diploma o certificado.
                      </p>
                    </div>
                  </div>
                  <div className="verificationUploadActions">
                    <input
                      ref={fileInput}
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUpload(file);
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="secondaryButton"
                      disabled={busyType === documentType}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={16} />
                      {uploaded ? "Reemplazar certificado" : "Subir otro certificado"}
                    </button>
                    {uploaded && <span className="verificationUploadedTag">Archivo cargado</span>}
                  </div>
                </article>

                <button
                  className="primaryButton wide"
                  disabled={!canSubmit || busyType === "submit"}
                >
                  {busyType === "submit" ? (
                    "Enviando…"
                  ) : (
                    <>
                      Enviar verificación gratuita <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
