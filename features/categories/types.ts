import {
  CANONICAL_CATEGORIES,
  getCanonicalCategoryById,
} from "@/features/categories/catalog";

const SERVICE_CATEGORY_IDS = [
  "hogar",
  "automotriz",
  "construccion",
  "tecnologia",
  "jardineria",
  "limpieza",
  "transporte-de-carga",
  "salud",
  "educacion",
  "profesionales",
  "auxiliar-de-aseo",
  "fuerzas-armadas-orden-seguridad",
] as const satisfies readonly (typeof CANONICAL_CATEGORIES)[number]["id"][];

export type ServiceCategory = (typeof CANONICAL_CATEGORIES)[number]["name"];

export const SERVICE_CATEGORIES: readonly ServiceCategory[] = SERVICE_CATEGORY_IDS.map((id) => {
  const category = getCanonicalCategoryById(id);
  if (!category) {
    throw new Error(`Identidad canónica inválida para la categoría ${id}.`);
  }

  return category.name as ServiceCategory;
});

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
