export type LocationPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export type GeolocationUsage = "client-map" | "availability";

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

export function geolocationFailureMessage(
  code: "denied" | "unavailable" | "timeout" | "unsupported",
  usage: GeolocationUsage = "client-map",
): string {
  if (usage === "availability") {
    switch (code) {
      case "denied":
        return "Activa el permiso de ubicación para aparecer en el mapa, o busca tu comuna abajo.";
      case "timeout":
        return "El GPS tardó demasiado. Puedes usar tu última ubicación o buscar tu comuna.";
      case "unsupported":
        return "Este navegador no permite GPS (abre ZOVIT en localhost o HTTPS). Busca tu comuna abajo.";
      default:
        return "No pudimos obtener tu GPS. Busca tu comuna para aparecer en el mapa.";
    }
  }

  switch (code) {
    case "denied":
      return "Necesitamos tu ubicación para mostrar profesionales cercanos. También puedes ingresar una dirección manualmente.";
    case "timeout":
      return "La ubicación tardó demasiado. Prueba de nuevo o busca una dirección.";
    case "unsupported":
      return "Tu navegador no permite geolocalización. Ingresa una dirección manualmente.";
    default:
      return "No pudimos obtener tu ubicación. Puedes buscar una dirección.";
  }
}

export function shouldRetryGeolocationWithoutHighAccuracy(
  result: BrowserLocationResult,
  usedHighAccuracy: boolean,
): boolean {
  return !result.ok && usedHighAccuracy && (result.code === "timeout" || result.code === "unavailable");
}

function isInsecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === false;
}

function getCurrentPosition(options: {
  timeoutMs: number;
  maximumAgeMs: number;
  enableHighAccuracy: boolean;
  usage: GeolocationUsage;
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
            message: geolocationFailureMessage("denied", options.usage),
          });
          return;
        }
        if (err.code === err.TIMEOUT) {
          resolve({
            ok: false,
            code: "timeout",
            message: geolocationFailureMessage("timeout", options.usage),
          });
          return;
        }
        resolve({
          ok: false,
          code: "unavailable",
          message: geolocationFailureMessage("unavailable", options.usage),
        });
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeoutMs,
        maximumAge: options.maximumAgeMs,
      },
    );
  });
}

export async function requestBrowserLocation(options?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
  usage?: GeolocationUsage;
}): Promise<BrowserLocationResult> {
  const usage = options?.usage ?? "client-map";

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      code: "unsupported",
      message: geolocationFailureMessage("unsupported", usage),
    };
  }

  if (isInsecureContext()) {
    return {
      ok: false,
      code: "unsupported",
      message: geolocationFailureMessage("unsupported", usage),
    };
  }

  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const timeoutMs = options?.timeoutMs ?? 12_000;
  const maximumAgeMs = options?.maximumAgeMs ?? 30_000;

  const first = await getCurrentPosition({
    timeoutMs,
    maximumAgeMs,
    enableHighAccuracy,
    usage,
  });

  if (
    shouldRetryGeolocationWithoutHighAccuracy(first, enableHighAccuracy)
  ) {
    const retry = await getCurrentPosition({
      timeoutMs: Math.max(timeoutMs, 8_000),
      maximumAgeMs: Math.max(maximumAgeMs, 60_000),
      enableHighAccuracy: false,
      usage,
    });
    if (retry.ok) return retry;
  }

  return first;
}
