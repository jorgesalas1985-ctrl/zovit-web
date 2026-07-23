import type { Metadata } from "next";
import type { ResolvedCategoryPath } from "@/lib/categories/hierarchy";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.zovit.cl";

export function buildCategoryMetadata(
  resolved: ResolvedCategoryPath,
  options?: { isListing?: boolean },
): Metadata {
  const { leaf } = resolved;
  const isListing = options?.isListing ?? false;
  const titleBase = isListing ? leaf.name : `Profesionales para ${leaf.name.toLowerCase()}`;
  const title = `${titleBase} | Profesionales verificados | ZOVIT`;
  const description = isListing
    ? leaf.description ?? `Explora ${leaf.name.toLowerCase()} y sus servicios disponibles en ZOVIT.`
    : `Encuentra profesionales con experiencia en ${leaf.name.toLowerCase()} y perfiles verificados en ZOVIT.`;

  const slugPath = resolved.nodes.map((node) => node.slug).join("/");
  const canonical = `${BASE_URL}/categorias/${slugPath}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "ZOVIT",
      type: "website",
    },
  };
}

export function buildCategoriesIndexMetadata(): Metadata {
  const title = "Categorías de servicios | ZOVIT";
  const description =
    "Explora categorías, subcategorías y especialidades para encontrar profesionales verificados en ZOVIT.";
  const canonical = `${BASE_URL}/categorias`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "ZOVIT",
      type: "website",
    },
  };
}
