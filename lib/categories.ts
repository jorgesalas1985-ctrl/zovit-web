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
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
