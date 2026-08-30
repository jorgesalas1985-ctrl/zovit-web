"use client";

import { AlertCircle, ArrowRight, ScanFace, Smartphone, Upload } from "lucide-react";
import { FormEvent, useMemo, useRef } from "react";
import Image from "next/image";
import { BiometricWizard } from "@/components/verification/BiometricWizard";
import { MobileDocumentCaptureButton } from "@/components/verification/MobileDocumentCaptureButton";
import type { RegistrationDocument } from "@/lib/registration/finishRegistration";
import { normalizeChileanRut } from "@/lib/registration/validateRegistration";
import { FIELD_PLACEHOLDERS } from "@/lib/ui/fieldPlaceholders";
import { formatChileanDateInput } from "@/lib/ui/chileanDate";
import {
  type IdentityDocumentType,
} from "@/lib/verification/types";

type PendingBiometricFormProps = {
  documents: RegistrationDocument[];
  rut: string;
  onRutChange: (value: string) => void;
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  carnetBirthDateConfirmed: boolean;
  onCarnetBirthDateConfirmedChange: (value: boolean) => void;
  onAddDocument: (
    type: IdentityDocumentType,
    file: File,
    metadata?: Record<string, unknown> | null
  ) => void;
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  message: string;
};

export function PendingBiometricForm({
  documents,
  rut,
  onRutChange,
  birthDate,
  onBirthDateChange,
  carnetBirthDateConfirmed,
  onCarnetBirthDateConfirmedChange,
  onAddDocument,
  onSubmit,
  busy,
  message,
}: PendingBiometricFormProps) {
  const carnetFileInputs = useRef<Partial<Record<"cedula_front" | "cedula_back", HTMLInputElement | null>>>({});
  const hasSelfie = documents.some((doc) => doc.document_type === "selfie");
  const hasLiveness = documents.some((doc) => doc.document_type === "liveness_proof");
  const previews = useMemo(() => Object.fromEntries(documents.filter((doc) => doc.document_type === "cedula_front" || doc.document_type === "cedula_back" || doc.document_type === "selfie").map((doc) => [doc.document_type, URL.createObjectURL(doc.file)])), [documents]);

  return (
    <>
      <form className="verificationUploadGrid" onSubmit={onSubmit}>
        <article className="verificationUploadCard identityDataCard">
          <label>
            RUT
            <div className="rutInputRow">
              <input
                required
                value={rut}
                onChange={(event) => {
                  const characters = event.target.value.replace(/[^0-9kK]/g, "").slice(0, 9);
                  onRutChange(normalizeChileanRut(characters));
                }}
                placeholder={FIELD_PLACEHOLDERS.rut}
                autoComplete="off"
                inputMode="numeric"
                maxLength={12}
              />
              <button
                type="button"
                className="rutKButton"
                disabled={rut.replace(/\D/g, "").length < 7}
                onClick={() => {
                  const body = rut.replace(/\D/g, "").slice(0, 8);
                  onRutChange(normalizeChileanRut(`${body}K`));
                }}
                aria-label="Usar K como dígito verificador"
              >
                K
              </button>
            </div>
          </label>
          <label>
            Fecha de nacimiento
            <input
              required
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              value={birthDate}
              onChange={(event) => onBirthDateChange(formatChileanDateInput(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && birthDate.endsWith("-")) {
                  event.preventDefault();
                  const digits = birthDate.replace(/\D/g, "").slice(0, -1);
                  onBirthDateChange(formatChileanDateInput(digits));
                }
              }}
              placeholder="DD-MM-AAAA"
              maxLength={10}
            />
          </label>
          <label className="identityAdultCheck">
            <input
              type="checkbox"
              checked={carnetBirthDateConfirmed}
              onChange={(event) => onCarnetBirthDateConfirmedChange(event.target.checked)}
            />
            <span>Confirmo que soy mayor de 18 años.</span>
          </label>
        </article>

        <div className="verificationSectionLabel">Carnet</div>
        <article className="verificationUploadCard carnetPairCaptureCard">
          <div className="verificationUploadHead">
            <Smartphone size={20} />
            <div>
              <h3>Fotografiar carnet</h3>
              <p>Toma primero la foto frontal y luego el reverso, usando un solo código QR.</p>
            </div>
          </div>
          <MobileDocumentCaptureButton
            documentType="cedula_front"
            additionalDocumentType="cedula_back"
            label="Carnet completo (frontal y reverso)"
            busy={busy}
            disabled={busy}
            onCaptured={(file, metadata) => onAddDocument("cedula_front", file, metadata)}
            onAdditionalCaptured={(file, metadata) => onAddDocument("cedula_back", file, metadata)}
          />
          <div className="carnetPairPreviews" aria-label="Vista previa del carnet">
            {(["cedula_front", "cedula_back"] as const).map((type) => {
              const uploaded = documents.find((doc) => doc.document_type === type);
              const label = type === "cedula_front" ? "Frontal" : "Reverso";
              return (
                <div className="carnetPairPreview" key={type}>
                  {uploaded?.file.type.startsWith("image/") ? (
                    <Image
                      src={previews[type]}
                      alt={`Vista previa ${label.toLowerCase()} del carnet`}
                      width={180}
                      height={114}
                      unoptimized
                    />
                  ) : (
                    <div className="carnetPairPreviewEmpty">Foto pendiente</div>
                  )}
                  <strong>{label}</strong>
                  <input
                    ref={(node) => { carnetFileInputs.current[type] = node; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onAddDocument(type, file, { source: "direct-upload" });
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="secondaryButton carnetCloudUploadButton"
                    disabled={busy}
                    onClick={() => carnetFileInputs.current[type]?.click()}
                  >
                    <Upload size={16} /> {uploaded ? "Reemplazar" : `Subir ${label.toLowerCase()}`}
                  </button>
                </div>
              );
            })}
          </div>
        </article>

        <article className="verificationUploadCard biometricCompactCard">
          <div className="verificationUploadHead">
            <ScanFace size={18} />
            <div>
              <h3>Selfie y prueba de vida</h3>
            </div>
          </div>
          <MobileDocumentCaptureButton
            documentType="selfie"
            additionalDocumentType="liveness_proof"
            label="Selfie y prueba de vida"
            busy={busy}
            disabled={busy}
            onCaptured={(file, metadata) => onAddDocument("selfie", file, metadata)}
            onAdditionalCaptured={(file, metadata) => onAddDocument("liveness_proof", file, metadata)}
          />
          <BiometricWizard
            disabled={busy}
            hasSelfie={hasSelfie}
            hasLiveness={hasLiveness}
            busy={busy}
            selfiePreviewUrl={previews.selfie}
            onUpload={async (type, file, metadata) => {
              onAddDocument(type, file, metadata);
            }}
          />
        </article>

        {message && (
          <div className="formMessage verificationBottomMessage">
            <AlertCircle size={17} /> {message}
          </div>
        )}
        <button className="primaryButton wide">
          Continuar a crear cuenta <ArrowRight size={18} />
        </button>
      </form>
    </>
  );
}
