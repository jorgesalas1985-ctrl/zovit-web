export type LocationPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  if (!navigator.permissions?.query) return "prompt";
  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (result.state === "granted" || result.state === "denied" || result.state === "prompt") {
      return result.state;
    }
    return "prompt";
  } catch {
    return "prompt";
  }
}

export type BrowserLocationResult =
  | ({ ok: true; accuracy: number | null } & GeoPoint)
  | { ok: false; code: "denied" | "unavailable" | "timeout" | "unsupported"; message: string };

export function shouldRetryGeolocationWithoutHighAccuracy(
  result: BrowserLocationResult,
  usedHighAccuracy: boolean,
): boolean {
  return !result.ok && usedHighAccuracy && (result.code === "timeout" || result.code === "unavailable");
}

function getCurrentPosition(options: {
  timeoutMs: number;
  maximumAgeMs: number;
  enableHighAccuracy: boolean;
  deniedMessage?: string;
  timeoutMessage?: string;
}): Promise<BrowserLocationResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            ok: false,
            code: "denied",
            message:
              options.deniedMessage ??
              "No se autorizó el acceso a tu ubicación. Vuelve a presionar «Usar mi ubicación» y acepta el permiso del navegador.",
          });
          return;
        }
        if (err.code === err.TIMEOUT) {
          resolve({
            ok: false,
            code: "timeout",
            message:
              options.timeoutMessage ??
              "La ubicación tardó demasiado. Vuelve a presionar «Usar mi ubicación».",
          });
          return;
        }
        resolve({
          ok: false,
          code: "unavailable",
          message: "No pudimos obtener tu ubicación. Revisa que la ubicación del equipo esté activada.",
        });
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeoutMs,
        maximumAge: options.maximumAgeMs,
      }
    );
  });
}

export async function requestBrowserLocation(options?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
  deniedMessage?: string;
  timeoutMessage?: string;
}): Promise<BrowserLocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      code: "unsupported",
      message: "Tu navegador no permite geolocalización.",
    };
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      ok: false,
      code: "unsupported",
      message: "La ubicación requiere una conexión segura. Usa localhost o HTTPS.",
    };
  }

  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const timeoutMs = options?.timeoutMs ?? 12_000;
  const maximumAgeMs = options?.maximumAgeMs ?? 30_000;
  const messages = {
    deniedMessage: options?.deniedMessage,
    timeoutMessage: options?.timeoutMessage,
  };

  // Primer intento: GPS preciso. Si Windows no responde, replica la estrategia
  // comprobada en el PR #4: segundo intento de red/ubicación aproximada y caché.
  const first = await getCurrentPosition({
    timeoutMs,
    maximumAgeMs,
    enableHighAccuracy,
    ...messages,
  });

  if (shouldRetryGeolocationWithoutHighAccuracy(first, enableHighAccuracy)) {
    const retry = await getCurrentPosition({
      timeoutMs: Math.max(timeoutMs, 8_000),
      maximumAgeMs: Math.max(maximumAgeMs, 60_000),
      enableHighAccuracy: false,
      ...messages,
    });
    if (retry.ok) return retry;
  }

  return first;
}
import type { GeoPoint } from "@/lib/geo/coordinates";
