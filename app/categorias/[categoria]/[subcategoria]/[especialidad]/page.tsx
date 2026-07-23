import { SpecialtyBrowsePage } from "@/components/categories/SpecialtyBrowsePage";
import { buildCategoryMetadata } from "@/lib/categories/seo";
import { resolveCategoryPath } from "@/lib/categories/hierarchy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ categoria: string; subcategoria: string; especialidad: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria, subcategoria, especialidad } = await params;
  const resolved = resolveCategoryPath([categoria, subcategoria, especialidad]);
  if (!resolved) return {};
  return buildCategoryMetadata(resolved);
}

export default async function CategoriaEspecialidadPage({ params }: Props) {
  const { categoria, subcategoria, especialidad } = await params;
  const resolved = resolveCategoryPath([categoria, subcategoria, especialidad]);
  if (!resolved) notFound();

  return <SpecialtyBrowsePage resolved={resolved} />;
}
