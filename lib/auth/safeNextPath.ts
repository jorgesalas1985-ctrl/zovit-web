const ALLOWED_PREFIXES = [
  "/panel",
  "/perfil",
  "/pagos",
  "/solicitudes",
  "/trabajos",
  "/verificacion",
  "/experiencia",
  "/registro/biometria",
  "/registro/trabajador",
  "/categorias",
  "/credencial",
  "/profesional",
  "/intranet",
  "/admin",
  "/auth/restablecer-clave",
  "/seguridad",
  "/ayuda",
  "/ia",
] as const;

/** Only same-origin relative paths to known app areas. */
export function safeNextPath(next: string | null | undefined, fallback = "/panel"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (next.includes("://")) return fallback;

  const pathOnly = next.split("?")[0]?.split("#")[0] ?? "";
  if (!pathOnly) return fallback;

  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );

  return allowed ? next : fallback;
}
