/**
 * Servicios que requieren licencia/certificación formal.
 * No se pueden ofrecer solo por declaración: quedan bloqueados hasta verificación.
 */
const REGULATED_SPECIALTY_SLUGS = new Set([
  "electricidad-domiciliaria",
  "electricidad-obra",
  "electricidad-automotriz",
  "gasfiteria",
  "instalaciones-de-gas",
  "instalacion-de-gas",
  "gas",
]);

const REGULATED_KEYWORDS = [
  "electricista",
  "electricidad",
  "instalador de gas",
  "instalación de gas",
  "instalaciones de gas",
  "gas certificado",
  "sec",
  "superintendencia",
];

export function specialtyRequiresCredential(
  specialtySlug: string,
  specialtyName?: string
): boolean {
  const slug = specialtySlug.toLowerCase().trim();
  if (REGULATED_SPECIALTY_SLUGS.has(slug)) return true;

  const haystack = `${slug} ${specialtyName ?? ""}`.toLowerCase();
  return REGULATED_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function isCommunityCompatibleSpecialty(
  specialtySlug: string,
  specialtyName?: string
): boolean {
  return !specialtyRequiresCredential(specialtySlug, specialtyName);
}
