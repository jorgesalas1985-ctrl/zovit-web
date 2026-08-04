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
};

type CaptureState = "idle" | "generating" | "waiting" | "captured" | "error";

export function MobileDocumentCaptureButton({
  documentType,
  label,
  busy,
  disabled,
  onCaptured,
}: MobileDocumentCaptureButtonProps) {
  const pollTimerRef = useRef<number | null>(null);
  const closedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [state, setState] = useState<CaptureState>("idle");
  const [message, setMessage] = useState("");

  const mobileUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    const url = new URL("/registro/captura-movil", window.location.origin);
    url.searchParams.set("token", token);
    url.searchParams.set("type", documentType);
    url.searchParams.set("label", label);
    url.searchParams.set("returnTo", window.location.pathname + window.location.search);
    return url.toString();
  }, [documentType, label, token]);

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
    setState("generating");
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || !mobileUrl) return;

    let active = true;
    void QRCode.toDataURL(mobileUrl, {
      width: 240,
      margin: 1,
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
      const response = await fetch(
        `/api/registro/captura-movil?token=${encodeURIComponent(token)}&type=${encodeURIComponent(documentType)}`,
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
        return;
      }

      if (!data.ready || !data.signedUrl) {
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
        data.fileName ?? `${documentType}-celular.jpg`,
        { type: data.contentType ?? (blob.type || "image/jpeg") }
      );

      await onCaptured(file, {
        source: "mobile-qr",
        token,
        documentType,
        label,
      });

      setState("captured");
      setMessage("Foto cargada desde el celular.");
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
  }, [closeModal, documentType, label, onCaptured, open, stopPolling, token]);

  return (
    <>
      <button
        type="button"
        className="secondaryButton mobileCaptureButton"
        disabled={disabled || busy}
        onClick={openQr}
      >
        <Smartphone size={16} />
        Subir con celular
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
                  <Image src={qrDataUrl} alt={`QR para ${label}`} width={240} height={240} unoptimized />
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
                <a className="mobileCaptureLink" href={mobileUrl || "#"} target="_blank" rel="noreferrer">
                  Abrir en celular
                </a>
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
