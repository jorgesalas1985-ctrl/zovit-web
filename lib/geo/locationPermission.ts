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
  | { ok: true; latitude: number; longitude: number; accuracy: number | null }
  | { ok: false; code: "denied" | "unavailable" | "timeout" | "unsupported"; message: string };

export function requestBrowserLocation(options?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
}): Promise<BrowserLocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      code: "unsupported",
      message: "Tu navegador no permite geolocalización. Ingresa una dirección manualmente.",
    });
  }

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
              "Necesitamos tu ubicación para mostrar profesionales cercanos. También puedes ingresar una dirección manualmente.",
          });
          return;
        }
        if (err.code === err.TIMEOUT) {
          resolve({
            ok: false,
            code: "timeout",
            message: "La ubicación tardó demasiado. Prueba de nuevo o busca una dirección.",
          });
          return;
        }
        resolve({
          ok: false,
          code: "unavailable",
          message: "No pudimos obtener tu ubicación. Puedes buscar una dirección.",
        });
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeoutMs ?? 12_000,
        maximumAge: options?.maximumAgeMs ?? 30_000,
      }
    );
  });
}
