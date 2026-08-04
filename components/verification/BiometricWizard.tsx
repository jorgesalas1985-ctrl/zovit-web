"use client";

import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ScanFace } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type LivenessDirection = "left" | "right" | "center";

export function BiometricWizard({
  disabled,
  hasSelfie,
  hasLiveness,
  busy,
  onUpload,
}: BiometricWizardProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const demoAnimationRef = useRef<number | null>(null);
  const demoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [step, setStep] = useState<Step>(
    hasSelfie && hasLiveness ? "done" : hasSelfie ? "liveness" : "intro",
  );
  const [session, setSession] = useState<BiometricSession | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const [capturePhase, setCapturePhase] = useState<"idle" | "camera" | "countdown" | "capturing">("idle");
  const selfieAutoCaptureTimerRef = useRef<number | null>(null);
  const livenessAutoCaptureTimerRef = useRef<number | null>(null);
  const selfieAutoCaptureDoneRef = useRef(false);
  const livenessAutoCaptureDoneRef = useRef(false);

  const livenessDirection = useMemo<LivenessDirection>(() => {
    if (!session) return "center";
    if (session.challenge.id === "turn_left") return "left";
    if (session.challenge.id === "turn_right") return "right";
    return "center";
  }, [session]);

  const stopCamera = useCallback(() => {
    if (demoAnimationRef.current !== null) {
      window.cancelAnimationFrame(demoAnimationRef.current);
      demoAnimationRef.current = null;
    }
    demoCanvasRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startDemoCamera = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    demoCanvasRef.current = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la cámara de demo.");

    let frame = 0;
    const draw = () => {
      frame += 1;
      const pulse = 0.5 + Math.sin(frame / 12) * 0.5;
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#050816");
      gradient.addColorStop(0.6, "#11224d");
      gradient.addColorStop(1, "#0f766e");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "rgba(255,255,255,0.06)";
      context.fillRect(90, 90, canvas.width - 180, canvas.height - 180);

      context.fillStyle = "rgba(255,255,255,0.9)";
      context.beginPath();
      context.ellipse(canvas.width / 2, canvas.height / 2 + Math.sin(frame / 18) * 8, 120, 150, 0, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#1f2937";
      context.beginPath();
      context.ellipse(canvas.width / 2 - 46, canvas.height / 2 - 28, 18, 26, 0, 0, Math.PI * 2);
      context.ellipse(canvas.width / 2 + 46, canvas.height / 2 - 28, 18, 26, 0, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = "rgba(6,182,212,0.7)";
      context.lineWidth = 10;
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2 + 12, 60, Math.PI * 0.1, Math.PI * 0.9);
      context.stroke();

      context.fillStyle = "rgba(255,255,255,0.9)";
      context.font = "bold 42px Inter, Arial, sans-serif";
      context.fillText("DEMO LOCAL", 44, 72);
      context.font = "600 30px Inter, Arial, sans-serif";
      context.fillText("La cámara real no respondió, pero el flujo sigue visible.", 44, 116);
      context.font = "700 28px Inter, Arial, sans-serif";
      context.fillText(`Vista ${pulse > 0.5 ? "activa" : "lista"} · ${step === "selfie" ? "Selfie" : "Prueba de vida"}`, 44, canvas.height - 52);

      demoAnimationRef.current = window.requestAnimationFrame(draw);
    };

    draw();

    const stream = canvas.captureStream(12);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play();
    }
    setCameraReady(true);
  }, [step]);

  const startCamera = useCallback(async () => {
    setMessage("");
    stopCamera();
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
      return true;
    } catch {
      if (process.env.NODE_ENV === "development") {
        startDemoCamera();
        return true;
      }
      setMessage("No pudimos acceder a la cámara. Revisa permisos del navegador.");
      setCameraReady(false);
      return false;
    }
  }, [startDemoCamera, stopCamera]);

  useEffect(() => {
    if (step !== "liveness" || hasLiveness || session) return;
    setSession(createBiometricSession());
  }, [hasLiveness, session, step]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (selfieAutoCaptureTimerRef.current !== null) {
        window.clearTimeout(selfieAutoCaptureTimerRef.current);
      }
      if (livenessAutoCaptureTimerRef.current !== null) {
        window.clearTimeout(livenessAutoCaptureTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    sectionRef.current?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [step]);

  async function beginSelfieCapture() {
    setMessage("");
    setSession(null);
    setStep("selfie");
    setCapturePhase("camera");
    selfieAutoCaptureDoneRef.current = false;
    livenessAutoCaptureDoneRef.current = false;
    const started = await startCamera();
    if (!started) {
      setCapturePhase("idle");
      return;
    }

    setCapturePhase("countdown");
  }

  const captureSelfie = useCallback(async () => {
    if (!videoRef.current) return;
    setLocalBusy(true);
    setCapturePhase("capturing");
    setMessage("");
    try {
      const blob = await captureVideoFrame(videoRef.current);
      const file = blobToFile(blob, `selfie-${Date.now()}.jpg`);
      await onUpload("selfie", file, { capturedAt: new Date().toISOString(), source: "camera" });
      const nextSession = createBiometricSession();
      setSession(nextSession);
      setStep("liveness");
      setCapturePhase("countdown");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo capturar la selfie.");
      setCapturePhase("idle");
    } finally {
      setLocalBusy(false);
    }
  }, [onUpload]);

  const captureLiveness = useCallback(async () => {
    if (!videoRef.current || !session) return;
    setLocalBusy(true);
    setCapturePhase("capturing");
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
      setCapturePhase("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la prueba de vida.");
      setCapturePhase("idle");
    } finally {
      setLocalBusy(false);
    }
  }, [onUpload, session, stopCamera]);

  useEffect(() => {
    if (selfieAutoCaptureTimerRef.current !== null) {
      window.clearTimeout(selfieAutoCaptureTimerRef.current);
      selfieAutoCaptureTimerRef.current = null;
    }

    if (step !== "selfie" || hasSelfie || hasLiveness || disabled || !cameraReady || localBusy) {
      selfieAutoCaptureDoneRef.current = false;
      return;
    }

    if (selfieAutoCaptureDoneRef.current) return;

    selfieAutoCaptureDoneRef.current = true;
    selfieAutoCaptureTimerRef.current = window.setTimeout(() => {
      selfieAutoCaptureTimerRef.current = null;
      void captureSelfie();
    }, 5000);

    return () => {
      if (selfieAutoCaptureTimerRef.current !== null) {
        window.clearTimeout(selfieAutoCaptureTimerRef.current);
        selfieAutoCaptureTimerRef.current = null;
      }
    };
  }, [cameraReady, captureSelfie, disabled, hasLiveness, hasSelfie, localBusy, step]);

  useEffect(() => {
    if (livenessAutoCaptureTimerRef.current !== null) {
      window.clearTimeout(livenessAutoCaptureTimerRef.current);
      livenessAutoCaptureTimerRef.current = null;
    }

    if (step !== "liveness" || hasLiveness || disabled || !cameraReady || localBusy || !session) {
      livenessAutoCaptureDoneRef.current = false;
      return;
    }

    if (livenessAutoCaptureDoneRef.current) return;

    livenessAutoCaptureDoneRef.current = true;
    livenessAutoCaptureTimerRef.current = window.setTimeout(() => {
      livenessAutoCaptureTimerRef.current = null;
      void captureLiveness();
    }, 5000);

    return () => {
      if (livenessAutoCaptureTimerRef.current !== null) {
        window.clearTimeout(livenessAutoCaptureTimerRef.current);
        livenessAutoCaptureTimerRef.current = null;
      }
    };
  }, [captureLiveness, cameraReady, disabled, hasLiveness, localBusy, session, step]);

  const isBusy = busy || localBusy;

  return (
    <section ref={sectionRef} className={`biometricWizard biometricWizard--${step}`}>
      <div className="biometricWizardIntro">
        <div className="biometricWizardBadge">
          <ScanFace size={18} />
          <span>Captura guiada automática</span>
        </div>
        <p className="muted">
          Presiona selfie para abrir la cámara. Cada paso espera 5 segundos para leer la instrucción y luego captura sola.
        </p>
      </div>

      <div className="biometricProgress" aria-label="Progreso biométrico">
        <div
          className={`biometricProgressStep ${
            step === "selfie" ? "biometricProgressStep--active" : hasSelfie || step === "liveness" || step === "done" ? "biometricProgressStep--done" : ""
          }`}
        >
          <span>1</span>
          <strong>Selfie</strong>
        </div>
        <div
          className={`biometricProgressStep ${
            step === "liveness" ? "biometricProgressStep--active" : hasLiveness || step === "done" ? "biometricProgressStep--done" : ""
          }`}
        >
          <span>2</span>
          <strong>Prueba de vida</strong>
        </div>
      </div>

      {step === "intro" && (
        <div className="biometricIntroPanel">
          <p className="muted">Paso 1: presiona selfie para abrir la cámara y empezar la verificación.</p>
          <div className="biometricIntroActions">
            <button
              type="button"
              className="primaryButton biometricCaptureButton"
              disabled={disabled || isBusy}
              onClick={() => void beginSelfieCapture()}
            >
              {isBusy && capturePhase !== "idle" ? "Iniciando…" : "Selfie"}
            </button>
            {(hasSelfie || hasLiveness) && (
              <button
                type="button"
                className="secondaryButton biometricRetryButton"
                disabled={disabled || isBusy}
                onClick={() => void beginSelfieCapture()}
              >
                Repetir procedimiento
              </button>
            )}
          </div>
        </div>
      )}

      {(step === "selfie" || step === "liveness") && (
        <div className="biometricStep">
          <div className={`biometricCameraWrap ${cameraReady ? "biometricCameraWrap--active" : ""}`}>
            <video ref={videoRef} className="biometricVideo" playsInline muted />
            {!cameraReady && (
              <div className="biometricCameraOverlay biometricCameraOverlay--loading">
                <strong>Abriendo cámara…</strong>
                <p>Permite el acceso para continuar con la captura automática.</p>
              </div>
            )}
            {step === "liveness" && session && (
              <div className={`biometricChallengeOverlay biometricChallengeOverlay--${livenessDirection}`}>
                <strong>Prueba de vida</strong>
                <div className="biometricChallengeCue" aria-hidden="true">
                  {livenessDirection === "left" && <ArrowLeft size={26} />}
                  {livenessDirection === "right" && <ArrowRight size={26} />}
                  {livenessDirection === "center" && <ScanFace size={28} />}
                </div>
                <p>{session.challenge.instruction}</p>
                <p className="biometricCode">Código: {session.code}</p>
              </div>
            )}
          </div>

          {step === "selfie" && (
            <>
              <p className="muted">Paso 1: centra tu rostro mientras la cámara prepara la toma de selfie.</p>
              <div className="biometricSelfieGuide">
                <div className="biometricFacePulse" aria-hidden="true">
                  <span />
                </div>
                <p className="biometricCountdownHint">Capturando selfie en 5 segundos…</p>
              </div>
              {(!cameraReady || message) && (
                <button
                  type="button"
                  className="secondaryButton biometricRetryButton"
                  disabled={disabled || isBusy}
                  onClick={() => void beginSelfieCapture()}
                >
                  <Camera size={16} /> Reintentar cámara
                </button>
              )}
            </>
          )}

          {step === "liveness" && session && (
            <>
              <p className="muted">
                Paso 2: sigue la instrucción y asegúrate de que el código <strong>{session.code}</strong> se vea
                en pantalla mientras capturas. Esto confirma que eres una persona real en este momento.
              </p>
              <div className="biometricLivenessGuide">
                <div className="biometricLivenessFace" aria-hidden="true">
                  <ScanFace size={24} />
                </div>
                <p className="biometricCountdownHint">Captura de prueba de vida en 5 segundos…</p>
              </div>
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
                setCapturePhase("idle");
                selfieAutoCaptureDoneRef.current = false;
                livenessAutoCaptureDoneRef.current = false;
              }}
            >
              Volver a selfie
            </button>
          )}
        </div>
      )}

      {message && <p className="aiError">{message}</p>}
    </section>
  );
}
