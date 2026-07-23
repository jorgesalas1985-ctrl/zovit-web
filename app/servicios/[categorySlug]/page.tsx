import { resolveLegacyServiciosPath } from "@/lib/services/catalog";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ categorySlug: string }>;
};

export default async function LegacyCategoryRedirectPage({ params }: Props) {
  const { categorySlug } = await params;
  const target = resolveLegacyServiciosPath(categorySlug);
  if (!target) notFound();
  redirect(target);
}
