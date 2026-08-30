export const SERVICE_CATEGORIES = [
  "Hogar",
  "Automotriz",
  "Construcción",
  "Tecnología",
  "Jardinería",
  "Limpieza",
  "Transporte de carga",
  "Salud",
  "Educación",
  "Profesionales",
  "Auxiliar de Aseo",
  "Fuerzas Armadas, de Orden y Seguridad",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  summary?: string;
  icon?: string;
  featured?: boolean;
  requiresLegalNotice?: boolean;
  searchCategory?: string;
  searchSpecialty?: string;
  referencePrice?: string;
  children?: CategoryNode[];
};
