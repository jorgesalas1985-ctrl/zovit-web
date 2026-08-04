"use client";

import { ArrowLeft, Camera, CheckCircle2, ImageUp, Smartphone } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { IdentityDocumentType } from "@/lib/verification/types";

const TYPE_LABELS: Record<IdentityDocumentType, string> = {
  cedula_front: "Carnet / cédula (frontal)",
  cedula_back: "Carnet / cédula (reverso)",
  certificado_antecedentes: "Certificado de antecedentes",
  certificado_estudios: "Certificado de estudios",
  selfie: "Selfie biométrica",
  liveness_proof: "Prueba de vida",
};

type MobileCapturePageClientProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function toIdentityDocumentType(value: string | null): IdentityDocumentType | null {
  if (!value) return null;
  if (value in TYPE_LABELS) return value as IdentityDocumentType;
  return null;
}

export default function MobileCapturePageClient({ searchParams }: MobileCapturePageClientProps) {
  const token = getParam(searchParams.token);
  const documentType = toIdentityDocumentType(getParam(searchParams.type));
  const label = getParam(searchParams.label) || (documentType ? TYPE_LABELS[documentType] : "Documento");
  const returnTo = getParam(searchParams.returnTo);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const returnUrl = (() => {
    const fallback = "/registro";
    if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) return fallback;
    return returnTo;
  })();

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setMessage("No pudimos abrir la cámara. Usa el botón para elegir una foto.");
        setReady(false);
      }
    }

    void startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function captureAndUpload(blob: Blob) {
    if (!token || !documentType) {
      setMessage("Falta el token del QR.");
      return;
    }

    const file = new File([blob], `${documentType}-celular.jpg`, { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("token", token);
    formData.append("type", documentType);
    formData.append("file", file);

    setBusy(true);
    setMessage("");
    const response = await fetch("/api/registro/captura-movil", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error ?? "No se pudo subir la foto.");
      return;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    setDone(true);
    setMessage("Foto subida a ZOVIT.");
  }

  async function takePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) {
      setMessage("No se pudo preparar la foto.");
      return;
    }
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92)
    );
    if (!blob) {
      setMessage("No se pudo capturar la foto.");
      return;
    }
    await captureAndUpload(blob);
  }

  async function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await captureAndUpload(file);
    event.target.value = "";
  }

  if (!documentType) {
    return (
      <main className="authPage">
        <section className="authCard large">
          <h1>QR inválido</h1>
          <p className="muted">Vuelve a escanear el código desde ZOVIT.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="authPage mobileCapturePage">
      <section className="authCard large mobileCapturePageCard">
        <div className="mobileCaptureHeader">
          <div className="eyebrow">
            <Smartphone size={16} /> Captura desde celular
          </div>
          <h1>{label}</h1>
          <p className="muted">
            Toca tomar foto y la imagen se subirá automáticamente a ZOVIT para el carnet.
          </p>
        </div>

        <div className="mobileCaptureCamera">
          {ready ? (
            <video ref={videoRef} className="mobileCaptureVideo" playsInline muted />
          ) : (
            <div className="mobileCaptureCameraPlaceholder">
              <Camera size={34} />
              <p>{message || "Abriendo cámara…"}</p>
            </div>
          )}
        </div>

        <div className="mobileCaptureActions">
          <button type="button" className="primaryButton wide" disabled={busy || done} onClick={() => void takePhoto()}>
            {busy ? "Subiendo…" : done ? "Foto enviada" : "Tomar foto y subir"}
          </button>
          <label className="secondaryButton wide mobileCaptureFallback">
            <ImageUp size={16} />
            Elegir foto
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => void handleFileInput(event)} />
          </label>
        </div>

        {message && (
          <div className={done ? "notice" : "formMessage"}>
            {done ? <CheckCircle2 size={16} /> : <ArrowLeft size={16} />}
            {message}
          </div>
        )}

        <a className="textLink" href={returnUrl}>
          Volver a ZOVIT
        </a>
      </section>
    </main>
  );
}
