export const CORPORATE_EMAIL_DOMAIN = "zovit.cl";

export function slugifyCorporateLocalPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

export function buildCorporateEmailLocalPart(firstName: string, lastName: string): string {
  const first = slugifyCorporateLocalPart(firstName);
  const last = slugifyCorporateLocalPart(lastName);

  if (first && last) return `${first}.${last}`;
  return first || last;
}

export function composeCorporateEmail(
  localPart: string,
  domain = CORPORATE_EMAIL_DOMAIN
): string {
  const local = slugifyCorporateLocalPart(localPart.split("@")[0] ?? localPart);
  if (!local) return "";
  return `${local}@${domain}`;
}

export function parseCorporateEmailLocalPart(
  email: string,
  domain = CORPORATE_EMAIL_DOMAIN
): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.endsWith(`@${domain}`)) {
    return normalized.slice(0, -(domain.length + 1));
  }
  return slugifyCorporateLocalPart(normalized.split("@")[0] ?? normalized);
}

export function buildCorporateEmail(
  firstName: string,
  lastName: string,
  domain = CORPORATE_EMAIL_DOMAIN
): string {
  const localPart = buildCorporateEmailLocalPart(firstName, lastName);
  if (!localPart) return "";
  return `${localPart}@${domain}`;
}

export function isCorporateEmail(email: string, domain = CORPORATE_EMAIL_DOMAIN): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${domain}`) && normalized.includes("@");
}

export function validateCorporateEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return "Ingresa un correo corporativo.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "El formato del correo no es válido.";
  }

  if (!isCorporateEmail(normalized)) {
    return `Los accesos nuevos deben usar correo @${CORPORATE_EMAIL_DOMAIN}.`;
  }

  return null;
}

export function suggestAvailableCorporateEmail(
  firstName: string,
  lastName: string,
  takenEmails: string[],
  domain = CORPORATE_EMAIL_DOMAIN
): string {
  const baseLocal = buildCorporateEmailLocalPart(firstName, lastName);
  if (!baseLocal) return "";

  const taken = new Set(takenEmails.map((entry) => entry.trim().toLowerCase()));

  let candidate = `${baseLocal}@${domain}`;
  if (!taken.has(candidate)) return candidate;

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    candidate = `${baseLocal}${suffix}@${domain}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${baseLocal}.${Date.now()}@${domain}`;
}
