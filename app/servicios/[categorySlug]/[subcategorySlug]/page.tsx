import { SubcategoryBrowsePage } from "@/components/services/SubcategoryBrowsePage";
import { getSubcategoryBySlug } from "@/lib/services/catalog";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ categorySlug: string; subcategorySlug: string }>;
};

export default async function SubcategoryPage({ params }: Props) {
  const { categorySlug, subcategorySlug } = await params;
  const match = getSubcategoryBySlug(categorySlug, subcategorySlug);

  if (!match) notFound();

  return <SubcategoryBrowsePage category={match.category} subcategory={match.subcategory} />;
}
