import { CategoryListingPage } from "@/components/categories/CategoryListingPage";
import { SpecialtyBrowsePage } from "@/components/categories/SpecialtyBrowsePage";
import { buildCategoryMetadata } from "@/lib/categories/seo";
import { isLeafNode, resolveCategoryPath } from "@/lib/categories/hierarchy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ categoria: string; subcategoria: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria, subcategoria } = await params;
  const resolved = resolveCategoryPath([categoria, subcategoria]);
  if (!resolved) return {};
  return buildCategoryMetadata(resolved, { isListing: !isLeafNode(resolved.leaf) });
}

export default async function CategoriaSubcategoriaPage({ params }: Props) {
  const { categoria, subcategoria } = await params;
  const resolved = resolveCategoryPath([categoria, subcategoria]);
  if (!resolved) notFound();

  if (isLeafNode(resolved.leaf)) {
    return <SpecialtyBrowsePage resolved={resolved} />;
  }

  return (
    <CategoryListingPage
      resolved={resolved}
      listTitle="Especialidades disponibles"
    />
  );
}
