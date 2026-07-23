import { CategoryListingPage } from "@/components/categories/CategoryListingPage";
import { SpecialtyBrowsePage } from "@/components/categories/SpecialtyBrowsePage";
import { buildCategoryMetadata } from "@/lib/categories/seo";
import { isLeafNode, resolveCategoryPath } from "@/lib/categories/hierarchy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ categoria: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const resolved = resolveCategoryPath([categoria]);
  if (!resolved) return {};
  return buildCategoryMetadata(resolved, { isListing: true });
}

export default async function CategoriaPage({ params }: Props) {
  const { categoria } = await params;
  const resolved = resolveCategoryPath([categoria]);
  if (!resolved) notFound();

  if (isLeafNode(resolved.leaf)) {
    return <SpecialtyBrowsePage resolved={resolved} />;
  }

  return (
    <CategoryListingPage
      resolved={resolved}
      institutionLayout={resolved.root.slug === "fuerzas-armadas-orden-seguridad"}
      listTitle={
        resolved.root.slug === "fuerzas-armadas-orden-seguridad"
          ? "Instituciones disponibles"
          : "Subcategorías y servicios"
      }
    />
  );
}
