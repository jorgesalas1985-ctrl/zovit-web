"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, FileUp, ShieldCheck, Upload } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Protected } from "@/components/Protected";
import { RoleModeBanner } from "@/components/RoleModeBanner";
import { BiometricWizard } from "@/components/verification/BiometricWizard";
import { IdentityBadge, IdentityStatusPill } from "@/components/verification/IdentityBadge";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  getCarnetDocuments,
  getRequiredDocuments,
  hasAllRequiredDocuments,
  hasBiometricDocuments,
  IDENTITY_DOCUMENT_LABELS,
  type IdentityDocumentType,
  type IdentityVerificationState,
} from "@/lib/verification/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function documentHint(type: IdentityDocumentType) {
  if (type === "certificado_antecedentes") {
    return "PDF o foto legible del certificado emitido por el Registro Civil (www.registrocivil.cl). Debe incluir folio y fecha reciente.";
  }
  return "Foto clara y legible del carnet. Formatos JPG, PNG, WEBP o PDF.";
}

export default function VerificationPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [state, setState] = useState<IdentityVerificationState | null>(null);
  const [message, setMessage] = useState("");
  const [busyType, setBusyType] = useState<IdentityDocumentType | "submit" | "biometric" | null>(null);
  const fileInputs = useRef<Partial<Record<IdentityDocumentType, HTMLInputElement | null>>>({});

  const role = profile?.role ?? "client";
  const requiredDocuments = getRequiredDocuments(role);
  const carnetDocuments = getCarnetDocuments();
  const extraDocuments = requiredDocuments.filter((type) => !carnetDocuments.includes(type) && type !== "selfie" && type !== "liveness_proof");
  const isProfessional = role === "professional" || role === "admin";

  const loadState = useCallback(async () => {
    const response = await fetch("/api/verification");
    const data = (await response.json()) as IdentityVerificationState & { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar tu verificación.");
      return;
    }
    setState(data);
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function uploadDocument(
    type: IdentityDocumentType,
    file: File,
    metadata: Record<string, unknown> | null = null
  ) {
    if (!user) return;
    if (!ACCEPTED_TYPES.includes(file.type) && type !== "selfie" && type !== "liveness_proof") {
      setMessage("Formato no permitido. Usa JPG, PNG, WEBP o PDF.");
      return;
    }

    setBusyType(type === "selfie" || type === "liveness_proof" ? "biometric" : type);
    setMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${user.id}/${type}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("identity-documents")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setMessage(uploadError.message);
      setBusyType(null);
      return;
    }

    const existing = state?.documents.find((doc) => doc.document_type === type);
    if (existing) {
      await supabase.storage.from("identity-documents").remove([existing.storage_path]);
      await supabase.from("identity_documents").delete().eq("id", existing.id);
    }

    const { error: rowError } = await supabase.from("identity_documents").insert({
      profile_id: user.id,
      document_type: type,
      storage_path: path,
      status: "uploaded",
      metadata,
    });

    if (rowError) {
      setMessage(rowError.message);
      setBusyType(null);
      return;
    }

    await loadState();
    setBusyType(null);
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    setBusyType("submit");
    setMessage("");

    const response = await fetch("/api/verification", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "No se pudo enviar la verificación.");
      setBusyType(null);
      return;
    }

    await Promise.all([loadState(), refreshProfile()]);
    setMessage("Tu verificación fue enviada. Te avisaremos cuando esté revisada.");
    setBusyType(null);
  }

  const canSubmit =
    state &&
    state.identity_status !== "pending" &&
    state.identity_status !== "approved" &&
    hasAllRequiredDocuments(role, state.documents);

  const hasSelfie = !!state?.documents.some((doc) => doc.document_type === "selfie");
  const hasLiveness = !!state?.documents.some((doc) => doc.document_type === "liveness_proof");
  const biometricDone = state ? hasBiometricDocuments(state.documents) : false;
  const locked = state?.identity_status === "pending" || state?.identity_status === "approved";

  return (
    <Protected>
      <RoleModeBanner role={isProfessional ? "professional" : "client"} variant="page" />
      <main className="simplePage">
        <section className="formPageCard verificationPage">
          <div className="eyebrow">
            <ShieldCheck size={16} /> Verificación ZOVIT
          </div>
          <h1>Verificación gratuita con biometría</h1>
          <p className="muted">
            Validamos carnet, selfie en vivo y prueba de vida para proteger clientes y profesionales en la plataforma.
          </p>

          {state && (
            <div className="verificationStatusRow">
              <IdentityStatusPill status={state.identity_status} />
              {state.identity_verified && <IdentityBadge verified role={role} />}
              {state.biometric_verified && <span className="identityBadge">Biometría validada</span>}
            </div>
          )}

          <div className="verificationInfoBox">
            <h2>Programa biométrico ZOVIT</h2>
            <ul>
              <li>RUT completo en <Link href="/perfil">Mi perfil</Link>.</li>
              <li><strong>Carnet:</strong> cédula frontal y reverso.</li>
              <li><strong>Selfie:</strong> captura en vivo con cámara frontal.</li>
              <li><strong>Prueba de vida:</strong> instrucción dinámica + código en pantalla.</li>
              {isProfessional && (
                <li><strong>Antecedentes:</strong> certificado del Registro Civil (folio verificable).</li>
              )}
            </ul>
            <p className="muted">
              Revisión manual por ZOVIT. Los archivos biométricos son privados y no se comparten con otros usuarios.
            </p>
          </div>

          {state?.identity_status === "approved" && (
            <div className="notice">
              Tu identidad y biometría ya están verificadas.
            </div>
          )}

          {state?.identity_status === "pending" && (
            <div className="notice">Tu verificación está en revisión. Suele tardar entre 24 y 48 horas.</div>
          )}

          {state?.identity_status === "rejected" && (
            <div className="formMessage">
              <AlertCircle size={17} />
              {state.identity_rejection_reason ?? "Tu verificación fue rechazada. Completa nuevamente el proceso."}
            </div>
          )}

          {message && <div className="notice">{message}</div>}

          {state && !locked && (
            <form className="verificationUploadGrid" onSubmit={submitReview}>
              <div className="verificationSectionLabel">Paso 1 · Carnet</div>
              {carnetDocuments.map((type) => {
                const uploaded = state.documents.find((doc) => doc.document_type === type);
                return (
                  <article className="verificationUploadCard" key={type}>
                    <div className="verificationUploadHead">
                      <FileUp size={18} />
                      <div>
                        <h3>{IDENTITY_DOCUMENT_LABELS[type]}</h3>
                        <p>{documentHint(type)}</p>
                      </div>
                    </div>
                    <div className="verificationUploadActions">
                      <input
                        ref={(node) => {
                          fileInputs.current[type] = node;
                        }}
                        type="file"
                        accept={ACCEPTED_TYPES.join(",")}
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadDocument(type, file);
                          event.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="secondaryButton"
                        disabled={busyType === type}
                        onClick={() => fileInputs.current[type]?.click()}
                      >
                        <Upload size={16} />
                        {uploaded ? "Reemplazar archivo" : "Subir carnet"}
                      </button>
                      {uploaded && <span className="verificationUploadedTag">Archivo cargado</span>}
                    </div>
                  </article>
                );
              })}

              <div className="verificationSectionLabel">Paso 2 · Biometría</div>
              <article className="verificationUploadCard">
                <BiometricWizard
                  disabled={locked}
                  hasSelfie={hasSelfie}
                  hasLiveness={hasLiveness}
                  busy={busyType === "biometric"}
                  onUpload={uploadDocument}
                />
                {biometricDone && <span className="verificationUploadedTag">Biometría completa</span>}
              </article>

              {extraDocuments.length > 0 && (
                <>
                  <div className="verificationSectionLabel">Paso 3 · Antecedentes (profesional)</div>
                  {extraDocuments.map((type) => {
                    const uploaded = state.documents.find((doc) => doc.document_type === type);
                    return (
                      <article className="verificationUploadCard" key={type}>
                        <div className="verificationUploadHead">
                          <FileUp size={18} />
                          <div>
                            <h3>{IDENTITY_DOCUMENT_LABELS[type]}</h3>
                            <p>{documentHint(type)}</p>
                          </div>
                        </div>
                        <div className="verificationUploadActions">
                          <input
                            ref={(node) => {
                              fileInputs.current[type] = node;
                            }}
                            type="file"
                            accept={ACCEPTED_TYPES.join(",")}
                            hidden
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadDocument(type, file);
                              event.target.value = "";
                            }}
                          />
                          <button
                            type="button"
                            className="secondaryButton"
                            disabled={busyType === type}
                            onClick={() => fileInputs.current[type]?.click()}
                          >
                            <Upload size={16} />
                            {uploaded ? "Reemplazar archivo" : "Subir certificado"}
                          </button>
                          {uploaded && <span className="verificationUploadedTag">Archivo cargado</span>}
                        </div>
                      </article>
                    );
                  })}
                </>
              )}

              <button className="primaryButton wide" disabled={!canSubmit || busyType === "submit"}>
                {busyType === "submit" ? "Enviando…" : <>Enviar verificación gratuita <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </section>
      </main>
    </Protected>
  );
}
