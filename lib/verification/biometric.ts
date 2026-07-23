export type LivenessChallengeId = "turn_left" | "turn_right" | "look_center";

export type LivenessChallenge = {
  id: LivenessChallengeId;
  instruction: string;
};

export const LIVENESS_CHALLENGES: LivenessChallenge[] = [
  { id: "look_center", instruction: "Mira de frente a la cámara" },
  { id: "turn_left", instruction: "Gira la cabeza hacia tu izquierda" },
  { id: "turn_right", instruction: "Gira la cabeza hacia tu derecha" },
];

export type BiometricSession = {
  sessionId: string;
  code: string;
  challenge: LivenessChallenge;
  createdAt: string;
};

export function createBiometricSession(): BiometricSession {
  const challenge = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
  return {
    sessionId: crypto.randomUUID(),
    code: String(Math.floor(1000 + Math.random() * 9000)),
    challenge,
    createdAt: new Date().toISOString(),
  };
}

export async function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la captura.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo capturar la imagen."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}
