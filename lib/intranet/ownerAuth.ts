const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Owner privilegiado: UUID privado de servidor, nunca correo ni variable pública. */
export function getZovitOwnerUserId(): string | null {
  const value = process.env.ZOVIT_OWNER_USER_ID?.trim();
  return value && UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

export function isZovitRealOwner(userId: string | null | undefined, intranetRole: string | null | undefined): boolean {
  const ownerId = getZovitOwnerUserId();
  return Boolean(ownerId && userId && userId.toLowerCase() === ownerId && intranetRole === "super_admin");
}
