import { SERVICE_CATALOG } from "@/lib/ai/serviceCatalog";
import {
  countLeafSpecialties,
  getFeaturedRootCategories,
  getRootCategoryBySlug,
  getSortedRootCategories,
  resolveLegacyServiciosPath,
} from "@/lib/categories/hierarchy";
import { slugify } from "@/lib/utils/slugify";

export type SubcategoryDefinition = {
  id: string;
  slug: string;
  label: string;
  description: string;
  referencePrice: string;
  availability: string;
};

export type CategoryBrowseDefinition = {
  name: string;
  slug: string;
  summary: string;
  description: string;
  subcategories: SubcategoryDefinition[];
};

export { slugify };

function flattenSpecialties(categorySlug: string): SubcategoryDefinition[] {
  const root = getRootCategoryBySlug(categorySlug);
  if (!root) return [];

  const items: SubcategoryDefinition[] = [];

  function walk(node: NonNullable<typeof root>) {
    if (!node.children?.length) {
      items.push({
        id: node.id,
        slug: node.slug,
        label: node.name,
        description:
          node.description ??
          `Servicio profesional de ${node.name.toLowerCase()} con perfiles verificados en ZOVIT.`,
        referencePrice: node.referencePrice ?? "Precio referencial a confirmar con el profesional",
        availability: "Profesionales conectados en ZOVIT",
      });
      return;
    }

    node.children.forEach((child) => walk(child));
  }

  root.children?.forEach((child) => walk(child));
  return items;
}

export const SERVICE_BROWSE_CATALOG: CategoryBrowseDefinition[] = getSortedRootCategories().map(
  (category) => ({
    name: category.name,
    slug: category.slug,
    summary: category.summary ?? category.description ?? category.name,
    description: category.description ?? category.summary ?? category.name,
    subcategories: flattenSpecialties(category.slug),
  }),
);

export function getCategoryBySlug(slug: string): CategoryBrowseDefinition | undefined {
  return SERVICE_BROWSE_CATALOG.find((category) => category.slug === slug);
}

export function getSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string,
): { category: CategoryBrowseDefinition; subcategory: SubcategoryDefinition } | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;

  const subcategory = category.subcategories.find((item) => item.slug === subcategorySlug);
  if (!subcategory) return undefined;

  return { category, subcategory };
}

export function getFeaturedCategories(limit = 5): CategoryBrowseDefinition[] {
  return getFeaturedRootCategories(limit).map((category) => ({
    name: category.name,
    slug: category.slug,
    summary: category.summary ?? category.description ?? category.name,
    description: category.description ?? category.summary ?? category.name,
    subcategories: flattenSpecialties(category.slug),
  }));
}

export function getCategoryLeafCount(slug: string): number {
  const root = getRootCategoryBySlug(slug);
  if (!root) return 0;
  return countLeafSpecialties(root);
}

export { resolveLegacyServiciosPath };

export function getSpecialtyLabelFromCatalog(categoryName: string, specialtyId: string): string {
  const match = SERVICE_CATALOG.find((item) => item.category === categoryName);
  return match?.specialties.find((specialty) => specialty.id === specialtyId)?.label ?? specialtyId;
}
