import { resolveLegacyServiciosPath } from "@/lib/services/catalog";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ categorySlug: string; subcategorySlug: string }>;
};

export default async function LegacySubcategoryRedirectPage({ params }: Props) {
  const { categorySlug, subcategorySlug } = await params;
  const target = resolveLegacyServiciosPath(categorySlug, subcategorySlug);
  if (!target) notFound();
  redirect(target);
}
