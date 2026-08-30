"use client";

import { CheckCircle2, QrCode, Smartphone } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IdentityDocumentType } from "@/lib/verification/types";

type MobileDocumentCaptureButtonProps = {
  documentType: IdentityDocumentType;
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onCaptured: (file: File, metadata: Record<string, unknown>) => void | Promise<void>;
  additionalDocumentType?: IdentityDocumentType;
  onAdditionalCaptured?: (file: File, metadata: Record<string, unknown>) => void | Promise<void>;
};

type CaptureState = "idle" | "generating" | "waiting" | "captured" | "error";

export function MobileDocumentCaptureButton({
  documentType,
  label,
  busy,
  disabled,
  onCaptured,
  additionalDocumentType,
  onAdditionalCaptured,
}: MobileDocumentCaptureButtonProps) {
  const pollTimerRef = useRef<number | null>(null);
  const closedRef = useRef(false);
  const capturedTypesRef = useRef(new Set<IdentityDocumentType>());
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [state, setState] = useState<CaptureState>("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [localNetworkOrigin, setLocalNetworkOrigin] = useState("");

  const mobileUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const mobileOrigin = isLocalhost ? localNetworkOrigin : window.location.origin;
    if (!mobileOrigin) return "";
    const url = new URL("/registro/captura-movil", mobileOrigin);
    url.searchParams.set("token", token);
    const pairedType = documentType === "selfie" ? "biometric_pair" : "carnet_pair";
    url.searchParams.set("type", additionalDocumentType ? pairedType : documentType);
    return url.toString();
  }, [additionalDocumentType, documentType, localNetworkOrigin, token]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const closeModal = useCallback(() => {
    closedRef.current = true;
    stopPolling();
    setOpen(false);
    setToken("");
    setQrDataUrl("");
    setState("idle");
    setMessage("");
  }, [stopPolling]);

  const openQr = useCallback(() => {
    closedRef.current = false;
    setToken(crypto.randomUUID());
    setQrDataUrl("");
    setMessage("");
    setCopied(false);
    setLocalNetworkOrigin("");
    capturedTypesRef.current.clear();
    setState("generating");
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setLocalNetworkOrigin(window.location.origin);
      return;
    }

    let active = true;
    void fetch("/api/local-network-url", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "No se pudo obtener la red local.");
        if (active) setLocalNetworkOrigin(data.url.replace(/\/$/, ""));
      })
      .catch((error) => {
        if (!active) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "No se pudo preparar el enlace para el celular.");
      });

    return () => {
      active = false;
    };
  }, [open]);

  const copyMobileUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
    } catch {
      window.prompt("Copia este enlace y envíalo al celular:", mobileUrl);
    }
  }, [mobileUrl]);

  useEffect(() => {
    if (!open || !mobileUrl) return;

    let active = true;
    void QRCode.toDataURL(mobileUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
          setState("waiting");
        }
      })
      .catch((error) => {
        if (active) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "No se pudo generar el QR.");
        }
      });

    return () => {
      active = false;
    };
  }, [mobileUrl, open]);

  useEffect(() => {
    if (!open || !token) return;

    stopPolling();
    setState("waiting");

    const poll = async () => {
      let completionReady = false;
      const completionResponse = await fetch(
        `/api/registro/captura-movil?token=${encodeURIComponent(token)}&type=capture_complete`,
        { cache: "no-store" }
      );
      if (completionResponse.ok) {
        const completion = (await completionResponse.json()) as { ready?: boolean };
        completionReady = completion.ready === true;
      }
      const types = additionalDocumentType ? [documentType, additionalDocumentType] : [documentType];
      for (const currentType of types) {
      if (capturedTypesRef.current.has(currentType)) continue;
      const response = await fetch(
        `/api/registro/captura-movil?token=${encodeURIComponent(token)}&type=${encodeURIComponent(currentType)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        ready?: boolean;
        signedUrl?: string;
        fileName?: string;
        contentType?: string;
        error?: string;
      };

      if (!response.ok) {
        setState("error");
        setMessage(data.error ?? "No se pudo revisar la foto del celular.");
        stopPolling();
        continue;
      }

      if (!data.ready || !data.signedUrl) {
        if (completionReady) {
          stopPolling();
          closeModal();
        }
        return;
      }

      const fileResponse = await fetch(data.signedUrl);
      if (!fileResponse.ok) {
        setState("error");
        setMessage("No se pudo descargar la foto tomada con el celular.");
        stopPolling();
        return;
      }

      const blob = await fileResponse.blob();
      const file = new File(
        [blob],
        data.fileName ?? `${currentType}-celular.jpg`,
        { type: data.contentType ?? (blob.type || "image/jpeg") }
      );

      const handler = currentType === documentType ? onCaptured : onAdditionalCaptured;
      await handler?.(file, {
        source: "mobile-qr",
        token,
        documentType: currentType,
        label,
      });

      capturedTypesRef.current.add(currentType);
      }
      if (capturedTypesRef.current.size < types.length) return;
      setState("captured");
      setMessage(additionalDocumentType
        ? documentType === "selfie" ? "Selfie y prueba de vida cargadas desde el celular." : "Frontal y reverso cargados desde el celular."
        : "Foto cargada desde el celular.");
      stopPolling();
      window.setTimeout(() => {
        if (!closedRef.current) closeModal();
      }, 700);
    };

    pollTimerRef.current = window.setInterval(() => {
      void poll();
    }, 1800);
    void poll();

    return () => {
      stopPolling();
    };
  }, [additionalDocumentType, closeModal, documentType, label, onAdditionalCaptured, onCaptured, open, stopPolling, token]);

  return (
    <>
      <button
        type="button"
        className="secondaryButton mobileCaptureButton"
        disabled={disabled || busy}
        onClick={openQr}
      >
        {documentType === "selfie" ? <QrCode size={17} /> : <Smartphone size={16} />}
        {additionalDocumentType
          ? documentType === "selfie" ? "Hacer con celular (QR)" : "Fotografiar frontal y reverso"
          : "Subir con celular"}
      </button>

      {open && (
        <div className="mobileCaptureBackdrop" role="presentation" onClick={closeModal}>
          <div
            className="mobileCaptureDialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Subir ${label} con celular`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobileCaptureDialogHead">
              <div className="mobileCaptureTitle">
                <QrCode size={18} />
                <div>
                  <strong>{label}</strong>
                  <p>Escanea el QR desde tu celular para tomar la foto y subirla a ZOVIT.</p>
                </div>
              </div>
              <button type="button" className="iconButton" onClick={closeModal} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className="mobileCaptureBody">
              <div className="mobileCaptureQrWrap">
                {qrDataUrl ? (
                  <Image src={qrDataUrl} alt={`QR para ${label}`} width={320} height={320} unoptimized />
                ) : (
                  <div className="mobileCaptureQrPlaceholder">
                    <QrCode size={42} />
                    <span>Generando QR…</span>
                  </div>
                )}
              </div>

              <div className="mobileCaptureSteps">
                <p>1. Escanea el código.</p>
                <p>2. Permite la cámara en tu celular.</p>
                <p>3. Toma la foto y se cargará sola en ZOVIT.</p>
                <button
                  type="button"
                  className="mobileCaptureLink"
                  onClick={() => void copyMobileUrl()}
                >
                  {copied ? "Enlace copiado" : "Copiar enlace para el celular"}
                </button>
              </div>
            </div>

            {state === "captured" && (
              <div className="notice mobileCaptureNotice">
                <CheckCircle2 size={16} />
                {message}
              </div>
            )}

            {state === "error" && message && (
              <div className="formMessage mobileCaptureNotice">{message}</div>
            )}

            <div className="mobileCaptureFooter">
              <button type="button" className="secondaryButton" onClick={closeModal}>
                Cerrar
              </button>
              <span className="muted">El escritorio revisa la foto automáticamente.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
