"use client";

import { ArrowLeft, Camera, CheckCircle2, ImageUp, Smartphone } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import Image from "next/image";
import type { IdentityDocumentType } from "@/lib/verification/types";

const TYPE_LABELS: Record<IdentityDocumentType, string> = {
  cedula_front: "Carnet / cédula (frontal)",
  cedula_back: "Carnet / cédula (reverso)",
  certificado_antecedentes: "Certificado de antecedentes",
  certificado_estudios: "Certificado de estudios",
  selfie: "Selfie biométrica",
  liveness_proof: "Prueba de vida",
};

type Props = { searchParams: Record<string, string | string[] | undefined> };

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function toDocumentType(value: string): IdentityDocumentType | null {
  return value in TYPE_LABELS ? (value as IdentityDocumentType) : null;
}

export default function MobileCapturePageClient({ searchParams }: Props) {
  const token = getParam(searchParams.token);
  const requestedType = getParam(searchParams.type);
  const isCarnetPair = requestedType === "carnet_pair";
  const isBiometricPair = requestedType === "biometric_pair";
  const isPair = isCarnetPair || isBiometricPair;
  const [pairStep, setPairStep] = useState<"front" | "back">("front");
  const documentType = isPair
    ? isCarnetPair
      ? pairStep === "front" ? "cedula_front" : "cedula_back"
      : pairStep === "front" ? "selfie" : "liveness_proof"
    : toDocumentType(requestedType);
  const label = documentType ? TYPE_LABELS[documentType] : "Documento";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [returning, setReturning] = useState(false);
  const [previews, setPreviews] = useState<Partial<Record<"front" | "back", string>>>({});

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected || !token || !documentType) return;

    const formData = new FormData();
    formData.append("token", token);
    formData.append("type", documentType);
    formData.append("file", selected, `${documentType}-celular.jpg`);

    setBusy(true);
    const preview = URL.createObjectURL(selected);
    setMessage("");
    try {
      const response = await fetch("/api/registro/captura-movil", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "No se pudo subir la fotografía.");
        return;
      }
      if (isPair && pairStep === "front") {
        setPreviews((current) => ({ ...current, front: preview }));
        setPairStep("back");
        setMessage(isCarnetPair ? "Frontal cargado. Ahora toma la fotografía del reverso." : "Selfie cargada. Ahora sigue la indicación para la prueba de vida.");
      } else {
        setPreviews((current) => ({ ...current, [pairStep]: preview }));
        setDone(true);
        setMessage(isCarnetPair ? "Frontal y reverso cargados correctamente. Ya puedes volver al computador." : isBiometricPair ? "Selfie y prueba de vida cargadas correctamente. Ya puedes volver al computador." : "Fotografía cargada correctamente en ZOVIT. Ya puedes volver al computador.");
      }
    } catch {
      setMessage("No se pudo conectar con ZOVIT. Revisa tu conexión e intenta nuevamente.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function returnToZovit() {
    setReturning(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("type", "capture_complete");
      formData.append("file", new File([new Uint8Array([255, 216, 255, 217])], "complete.jpg", { type: "image/jpeg" }));
      await fetch("/api/registro/captura-movil", { method: "POST", body: formData });
    } finally {
      window.location.href = "/registro";
    }
  }

  if (!documentType || !token) {
    return (
      <main className="authPage mobileCapturePage">
        <section className="authCard large mobileCapturePageCard">
          <h1>QR inválido</h1>
          <p className="muted">Vuelve al computador y genera un código QR nuevo desde ZOVIT.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="authPage mobileCapturePage">
      <section className="authCard large mobileCapturePageCard">
        <div className="mobileCaptureHeader">
          <div className="eyebrow"><Smartphone size={16} /> Captura desde celular</div>
          <h1>{isCarnetPair ? (pairStep === "front" ? "1. Fotografía frontal" : "2. Fotografía posterior") : isBiometricPair ? (pairStep === "front" ? "1. Toma tu selfie" : "2. Gira el rostro y toma la foto") : label}</h1>
          <p className="muted">
            Abre la cámara del teléfono, toma una fotografía clara y ZOVIT la cargará automáticamente.
          </p>
        </div>

        {isPair && Object.keys(previews).length > 0 && (
          <div className="mobileCarnetPreviews">
            {previews.front && <Image src={previews.front} alt={isCarnetPair ? "Vista previa frontal" : "Vista previa de la selfie"} width={240} height={152} unoptimized />}
            {previews.back && <Image src={previews.back} alt={isCarnetPair ? "Vista previa posterior" : "Vista previa de prueba de vida"} width={240} height={152} unoptimized />}
          </div>
        )}

        <div className="mobileNativeCameraCard">
          {done ? <CheckCircle2 size={52} /> : <Camera size={52} />}
          <strong>{done ? "Fotografías enviadas" : isBiometricPair ? (pairStep === "front" ? "Mira de frente" : "Gira el rostro hacia un lado") : "Carnet listo para fotografiar"}</strong>
          <span>{done ? "Puedes cerrar esta página." : isBiometricPair ? "Usa la cámara frontal y mantén el rostro iluminado." : "Usa la cámara trasera y evita reflejos."}</span>
        </div>

        {!done && (
          <div className="mobileCaptureActions">
            <label className="mobileDirectFileLabel mobileDirectFileLabel--camera">
              <span><Camera size={19} /> {busy ? "Subiendo fotografía…" : "Abrir cámara"}</span>
              <input
                className="mobileDirectFileInput"
                type="file"
                accept="image/*"
                capture={isBiometricPair ? "user" : "environment"}
                disabled={busy}
                onChange={(event) => void uploadPhoto(event)}
              />
            </label>
            <label className="mobileDirectFileLabel">
              <span><ImageUp size={18} /> Elegir foto guardada</span>
              <input
                className="mobileDirectFileInput"
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(event) => void uploadPhoto(event)}
              />
            </label>
          </div>
        )}

        {message && (
          <div className={done ? "notice" : "formMessage"}>
            {done ? <CheckCircle2 size={17} /> : <ArrowLeft size={17} />} {message}
          </div>
        )}

        <button type="button" className="secondaryButton wide" disabled={returning} onClick={() => void returnToZovit()}>
          {returning ? "Volviendo…" : "Volver a ZOVIT"}
        </button>
      </section>
    </main>
  );
}
