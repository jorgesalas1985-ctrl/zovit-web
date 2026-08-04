const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function isValidStoragePathForUser(
  storagePath: string | null | undefined,
  userId: string,
): storagePath is string {
  if (typeof storagePath !== "string") return false;

  const normalized = storagePath.trim();
  if (normalized !== storagePath) return false;
  if (normalized.startsWith("/") || normalized.includes("\\")) return false;
  if (normalized.includes("..")) return false;
  if (normalized.includes("//")) return false;
  if (!normalized.startsWith(`${userId}/`)) return false;
  if (normalized.length <= `${userId}/`.length) return false;

  return true;
}
