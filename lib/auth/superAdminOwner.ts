const OWNER_EMAIL = (
  process.env.NEXT_PUBLIC_ZOVIT_OWNER_EMAIL ||
  process.env.ZOVIT_OWNER_EMAIL ||
  "jor.salasj47@gmail.com"
).trim().toLowerCase();

/** La superadministración pertenece exclusivamente a la cuenta fundadora de ZOVIT. */
export function isZovitOwnerEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.trim().toLowerCase() === OWNER_EMAIL);
}

export function isZovitSuperAdmin(
  _email: string | null | undefined,
  intranetRole: string | null | undefined,
): boolean {
  // El rol está protegido y solo puede existir en la cuenta fundadora. No se
  // vuelve a restringir por un correo configurable: eso podía dejar al
  // superadministrador legítimo sin acceso total.
  return intranetRole === "super_admin";
}
