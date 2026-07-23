"use client";

import { AlertCircle, ArrowRight, FileUp, GraduationCap, Upload } from "lucide-react";
import { FormEvent, useRef } from "react";
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
  const { state, message, busyType, uploadDocument, submitStudyCertificate, loadState } =
    useIdentityVerification();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const documentType: IdentityDocumentType = "certificado_estudios";
  const studyStatus = state?.study_verification_status ?? "none";
  const locked = studyStatus === "pending" || studyStatus === "approved";
  const uploaded = state?.documents.find((doc) => doc.document_type === documentType);
  const canSubmit =
    state &&
    !locked &&
    hasStudyCertificateDocument(state.documents);

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

  return (
    <Protected>
      <RoleGuard allowedRoles={["professional", "admin"]}>
        <main className="simplePage">
          <section className="formPageCard verificationPage">
            <div className="eyebrow">
              <GraduationCap size={16} /> Verificación ZOVIT
            </div>
            <h1>Verificación gratuita</h1>
            <p className="muted">
              Sube tus certificados de estudios para respaldar tu perfil profesional en ZOVIT.
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
                <li>Título, diploma o certificado de estudios formalizados.</li>
                <li>Debe ser legible e incluir institución y fecha.</li>
                <li>Formatos JPG, PNG, WEBP o PDF.</li>
              </ul>
              <p className="muted">
                Esta verificación es gratuita y solo aplica a profesionales. Los clientes no necesitan subir certificados.
              </p>
            </div>

            {studyStatus === "approved" && (
              <div className="notice">Tus certificados de estudios ya están verificados.</div>
            )}

            {studyStatus === "pending" && (
              <div className="notice">Tu certificado está en revisión. Suele tardar entre 24 y 48 horas.</div>
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
                      <p>PDF o foto legible de tu título, diploma o certificado de estudios.</p>
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
                      {uploaded ? "Reemplazar certificado" : "Subir certificado"}
                    </button>
                    {uploaded && <span className="verificationUploadedTag">Archivo cargado</span>}
                  </div>
                </article>

                <button className="primaryButton wide" disabled={!canSubmit || busyType === "submit"}>
                  {busyType === "submit" ? "Enviando…" : <>Enviar verificación gratuita <ArrowRight size={18} /></>}
                </button>
              </form>
            )}
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
