"use client";

import { AlertCircle, ArrowRight, FileUp, ScanFace, Upload } from "lucide-react";
import { FormEvent, useRef } from "react";
import { BiometricWizard } from "@/components/verification/BiometricWizard";
import type { RegistrationDocument } from "@/lib/registration/finishRegistration";
import {
  getCarnetDocuments,
  hasAllBiometricDocuments,
  hasBiometricDocuments,
  IDENTITY_DOCUMENT_LABELS,
  type IdentityDocumentType,
} from "@/lib/verification/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type PendingBiometricFormProps = {
  documents: RegistrationDocument[];
  rut: string;
  onRutChange: (value: string) => void;
  onAddDocument: (
    type: IdentityDocumentType,
    file: File,
    metadata?: Record<string, unknown> | null
  ) => void;
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  message: string;
};

function carnetHint() {
  return "Foto clara y legible del carnet. Formatos JPG, PNG, WEBP o PDF.";
}

export function PendingBiometricForm({
  documents,
  rut,
  onRutChange,
  onAddDocument,
  onSubmit,
  busy,
  message,
}: PendingBiometricFormProps) {
  const fileInputs = useRef<Partial<Record<IdentityDocumentType, HTMLInputElement | null>>>({});

  const localState = documents.map((doc) => ({ document_type: doc.document_type }));
  const carnetDocuments = getCarnetDocuments();
  const hasSelfie = documents.some((doc) => doc.document_type === "selfie");
  const hasLiveness = documents.some((doc) => doc.document_type === "liveness_proof");
  const biometricDone = hasBiometricDocuments(localState);
  const canContinue = rut.trim().length > 0 && hasAllBiometricDocuments(localState);

  return (
    <>
      <div className="verificationInfoBox">
        <h2>Verificación biométrica ZOVIT</h2>
        <ul>
          <li><strong>RUT:</strong> requerido para validar tu identidad.</li>
          <li><strong>Carnet:</strong> cédula frontal y reverso.</li>
          <li><strong>Selfie:</strong> captura en vivo con cámara frontal.</li>
          <li><strong>Prueba de vida:</strong> instrucción dinámica + código en pantalla.</li>
        </ul>
        <p className="muted">
          Protege a clientes y profesionales en la plataforma. Los archivos biométricos son privados y solo los revisa ZOVIT.
        </p>
      </div>

      {message && (
        <div className="formMessage">
          <AlertCircle size={17} /> {message}
        </div>
      )}

      <form className="verificationUploadGrid" onSubmit={onSubmit}>
        <div className="verificationSectionLabel">RUT</div>
        <article className="verificationUploadCard">
          <label>
            RUT
            <input
              required
              value={rut}
              onChange={(event) => onRutChange(event.target.value)}
              placeholder="12.345.678-9"
            />
          </label>
        </article>

        <div className="verificationSectionLabel">Carnet</div>
        {carnetDocuments.map((type) => {
          const uploaded = documents.find((doc) => doc.document_type === type);
          return (
            <article className="verificationUploadCard" key={type}>
              <div className="verificationUploadHead">
                <FileUp size={18} />
                <div>
                  <h3>{IDENTITY_DOCUMENT_LABELS[type]}</h3>
                  <p>{carnetHint()}</p>
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
                    if (file) onAddDocument(type, file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={busy}
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

        <div className="verificationSectionLabel">Selfie y prueba de vida</div>
        <article className="verificationUploadCard">
          <div className="verificationUploadHead">
            <ScanFace size={18} />
            <div>
              <h3>Verificación biométrica</h3>
              <p>Selfie en vivo y prueba de vida con código dinámico.</p>
            </div>
          </div>
          <BiometricWizard
            disabled={busy}
            hasSelfie={hasSelfie}
            hasLiveness={hasLiveness}
            busy={busy}
            onUpload={async (type, file, metadata) => {
              onAddDocument(type, file, metadata);
            }}
          />
          {biometricDone && <span className="verificationUploadedTag">Biometría completa</span>}
        </article>

        <button className="primaryButton wide" disabled={!canContinue || busy}>
          {busy ? "Procesando…" : <>Continuar a crear cuenta <ArrowRight size={18} /></>}
        </button>
      </form>
    </>
  );
}
