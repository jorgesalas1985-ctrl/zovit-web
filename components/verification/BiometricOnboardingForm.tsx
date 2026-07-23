"use client";

import { AlertCircle, ArrowRight, FileUp, ScanFace, Upload } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { BiometricWizard } from "@/components/verification/BiometricWizard";
import { IdentityBadge, IdentityStatusPill } from "@/components/verification/IdentityBadge";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/auth/roles";
import {
  getCarnetDocuments,
  hasAllBiometricDocuments,
  hasBiometricDocuments,
  IDENTITY_DOCUMENT_LABELS,
  type IdentityDocumentType,
  type IdentityVerificationState,
} from "@/lib/verification/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type BiometricOnboardingFormProps = {
  userId: string;
  role: UserRole;
  state: IdentityVerificationState;
  rut: string;
  onRutChange: (value: string) => void;
  busyType: IdentityDocumentType | "submit" | "biometric" | null;
  message: string;
  onUpload: (
    type: IdentityDocumentType,
    file: File,
    metadata?: Record<string, unknown> | null
  ) => Promise<boolean>;
  onSubmit: (event: FormEvent) => void;
};

function carnetHint() {
  return "Foto clara y legible del carnet. Formatos JPG, PNG, WEBP o PDF.";
}

export function BiometricOnboardingForm({
  userId,
  role,
  state,
  rut,
  onRutChange,
  busyType,
  message,
  onUpload,
  onSubmit,
}: BiometricOnboardingFormProps) {
  const fileInputs = useRef<Partial<Record<IdentityDocumentType, HTMLInputElement | null>>>({});
  const [savingRut, setSavingRut] = useState(false);
  const [rutMessage, setRutMessage] = useState("");

  const carnetDocuments = getCarnetDocuments();
  const locked = state.identity_status === "pending" || state.identity_status === "approved";
  const hasSelfie = state.documents.some((doc) => doc.document_type === "selfie");
  const hasLiveness = state.documents.some((doc) => doc.document_type === "liveness_proof");
  const biometricDone = hasBiometricDocuments(state.documents);
  const canSubmit =
    !locked &&
    rut.trim().length > 0 &&
    hasAllBiometricDocuments(state.documents);

  async function saveRut() {
    if (!rut.trim()) {
      setRutMessage("Ingresa tu RUT para continuar.");
      return;
    }

    setSavingRut(true);
    setRutMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({ rut: rut.trim(), updated_at: new Date().toISOString() })
      .eq("id", userId);

    setSavingRut(false);
    setRutMessage(error ? error.message : "RUT guardado.");
  }

  return (
    <>
      <div className="verificationStatusRow">
        <IdentityStatusPill status={state.identity_status} />
        {state.identity_verified && <IdentityBadge verified role={role} />}
        {state.biometric_verified && <span className="identityBadge">Biometría validada</span>}
      </div>

      <div className="verificationInfoBox">
        <h2>Verificación biométrica ZOVIT</h2>
        <ul>
          <li><strong>RUT:</strong> requerido para validar tu identidad.</li>
          <li><strong>Carnet:</strong> cédula frontal y reverso.</li>
          <li><strong>Selfie:</strong> captura en vivo con cámara frontal.</li>
          <li><strong>Prueba de vida:</strong> instrucción dinámica + código en pantalla.</li>
        </ul>
        <p className="muted">
          Protege a clientes y profesionales. Los archivos biométricos son privados y solo los revisa ZOVIT.
        </p>
      </div>

      {state.identity_status === "approved" && (
        <div className="notice">Tu verificación biométrica ya está aprobada.</div>
      )}

      {state.identity_status === "pending" && (
        <div className="notice">Tu verificación biométrica está en revisión. Suele tardar entre 24 y 48 horas.</div>
      )}

      {state.identity_status === "rejected" && (
        <div className="formMessage">
          <AlertCircle size={17} />
          {state.identity_rejection_reason ?? "Tu verificación fue rechazada. Completa nuevamente el proceso."}
        </div>
      )}

      {message && <div className="notice">{message}</div>}

      {!locked && (
        <form className="verificationUploadGrid" onSubmit={onSubmit}>
          <div className="verificationSectionLabel">Paso 1 · RUT</div>
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
            <button
              type="button"
              className="secondaryButton"
              disabled={savingRut}
              onClick={() => void saveRut()}
            >
              {savingRut ? "Guardando…" : "Guardar RUT"}
            </button>
            {rutMessage && <p className="muted">{rutMessage}</p>}
          </article>

          <div className="verificationSectionLabel">Paso 2 · Carnet</div>
          {carnetDocuments.map((type) => {
            const uploaded = state.documents.find((doc) => doc.document_type === type);
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
                      if (file) void onUpload(type, file);
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

          <div className="verificationSectionLabel">Paso 3 · Verificación biométrica</div>
          <article className="verificationUploadCard">
            <div className="verificationUploadHead">
              <ScanFace size={18} />
              <div>
                <h3>Verificación biométrica</h3>
                <p>Selfie en vivo y prueba de vida con código dinámico.</p>
              </div>
            </div>
            <BiometricWizard
              disabled={locked}
              hasSelfie={hasSelfie}
              hasLiveness={hasLiveness}
              busy={busyType === "biometric"}
              onUpload={async (type, file, metadata) => {
                await onUpload(type, file, metadata);
              }}
            />
            {biometricDone && <span className="verificationUploadedTag">Biometría completa</span>}
          </article>

          <button className="primaryButton wide" disabled={!canSubmit || busyType === "submit"}>
            {busyType === "submit" ? "Enviando…" : <>Enviar verificación biométrica <ArrowRight size={18} /></>}
          </button>
        </form>
      )}
    </>
  );
}
