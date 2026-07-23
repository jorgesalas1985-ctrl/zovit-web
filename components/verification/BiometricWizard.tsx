"use client";

import { Camera, CheckCircle2, ScanFace } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  blobToFile,
  captureVideoFrame,
  createBiometricSession,
  type BiometricSession,
} from "@/lib/verification/biometric";

type BiometricWizardProps = {
  disabled?: boolean;
  hasSelfie: boolean;
  hasLiveness: boolean;
  busy?: boolean;
  onUpload: (
    type: "selfie" | "liveness_proof",
    file: File,
    metadata: Record<string, unknown>
  ) => Promise<void>;
};

type Step = "intro" | "selfie" | "liveness" | "done";

export function BiometricWizard({
  disabled,
  hasSelfie,
  hasLiveness,
  busy,
  onUpload,
}: BiometricWizardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>(hasSelfie && hasLiveness ? "done" : "intro");
  const [session, setSession] = useState<BiometricSession | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  useEffect(() => {
    if (hasSelfie && hasLiveness) setStep("done");
    else if (hasSelfie) setStep("liveness");
  }, [hasSelfie, hasLiveness]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setMessage("No pudimos acceder a la cámara. Revisa permisos del navegador.");
      setCameraReady(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function captureSelfie() {
    if (!videoRef.current) return;
    setLocalBusy(true);
    setMessage("");
    try {
      const blob = await captureVideoFrame(videoRef.current);
      const file = blobToFile(blob, `selfie-${Date.now()}.jpg`);
      await onUpload("selfie", file, { capturedAt: new Date().toISOString(), source: "camera" });
      const nextSession = createBiometricSession();
      setSession(nextSession);
      setStep("liveness");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo capturar la selfie.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function captureLiveness() {
    if (!videoRef.current || !session) return;
    setLocalBusy(true);
    setMessage("");
    try {
      const blob = await captureVideoFrame(videoRef.current);
      const file = blobToFile(blob, `liveness-${Date.now()}.jpg`);
      await onUpload("liveness_proof", file, {
        sessionId: session.sessionId,
        challengeId: session.challenge.id,
        challengeInstruction: session.challenge.instruction,
        challengeCode: session.code,
        capturedAt: new Date().toISOString(),
        source: "camera",
      });
      stopCamera();
      setStep("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la prueba de vida.");
    } finally {
      setLocalBusy(false);
    }
  }

  const isBusy = busy || localBusy;

  return (
    <section className="biometricWizard">
      <div className="verificationUploadHead">
        <ScanFace size={18} />
        <div>
          <h3>Verificación biométrica</h3>
          <p>Carnet + selfie en vivo + prueba de vida con código dinámico.</p>
        </div>
      </div>

      {step === "intro" && (
        <div className="biometricStep">
          <p className="muted">
            Usaremos tu cámara frontal para confirmar que eres la misma persona del carnet.
            Nadie más verá estas imágenes: solo el equipo de revisión ZOVIT.
          </p>
          <button
            type="button"
            className="primaryButton"
            disabled={disabled || isBusy}
            onClick={() => {
              setStep("selfie");
              void startCamera();
            }}
          >
            <Camera size={16} /> Iniciar captura biométrica
          </button>
        </div>
      )}

      {(step === "selfie" || step === "liveness") && (
        <div className="biometricStep">
          <div className="biometricCameraWrap">
            <video ref={videoRef} className="biometricVideo" playsInline muted />
            {!cameraReady && <div className="biometricCameraOverlay">Activando cámara…</div>}
            {step === "liveness" && session && (
              <div className="biometricChallengeOverlay">
                <strong>Prueba de vida</strong>
                <p>{session.challenge.instruction}</p>
                <p className="biometricCode">Código: {session.code}</p>
              </div>
            )}
          </div>

          {step === "selfie" && (
            <>
              <p className="muted">Paso 1: centra tu rostro y captura una selfie clara, sin lentes ni gorros.</p>
              <button
                type="button"
                className="primaryButton"
                disabled={disabled || isBusy || !cameraReady}
                onClick={() => void captureSelfie()}
              >
                {isBusy ? "Capturando…" : "Capturar selfie"}
              </button>
            </>
          )}

          {step === "liveness" && session && (
            <>
              <p className="muted">
                Paso 2: sigue la instrucción y asegúrate de que el código <strong>{session.code}</strong> se vea
                en pantalla mientras capturas. Esto confirma que eres una persona real en este momento.
              </p>
              <button
                type="button"
                className="primaryButton"
                disabled={disabled || isBusy || !cameraReady}
                onClick={() => void captureLiveness()}
              >
                {isBusy ? "Capturando…" : "Completar prueba de vida"}
              </button>
            </>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="biometricDone">
          <CheckCircle2 size={22} />
          <div>
            <strong>Biometría completada</strong>
            <p className="muted">Selfie y prueba de vida registradas correctamente.</p>
          </div>
          {!disabled && (
            <button
              type="button"
              className="secondaryButton"
              disabled={isBusy}
              onClick={() => {
                setSession(null);
                setStep("intro");
              }}
            >
              Repetir biometría
            </button>
          )}
        </div>
      )}

      {message && <p className="aiError">{message}</p>}
    </section>
  );
}
