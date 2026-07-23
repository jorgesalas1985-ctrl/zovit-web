import { ClickableServiceCard } from "@/components/services/ClickableServiceCard";
import { ServiceBrowseShell } from "@/components/services/ServiceBrowseShell";
import { getCategoryBySlug } from "@/lib/services/catalog";
import { getCategoryIcon } from "@/lib/services/icons";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ categorySlug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { categorySlug } = await params;
  const category = getCategoryBySlug(categorySlug);

  if (!category) notFound();

  const Icon = getCategoryIcon(category.name);

  return (
    <ServiceBrowseShell
      title={category.name}
      description={category.description}
      backHref="/servicios"
      backLabel="Volver a categorías"
      kicker="SUBCATEGORÍAS"
    >
      <div className="browseIntroCard">
        <div className="browseCardIcon">
          <Icon size={22} />
        </div>
        <div>
          <h2>{category.name}</h2>
          <p>{category.summary}</p>
        </div>
      </div>

      <div className="browseGrid">
        {category.subcategories.map((subcategory) => (
          <ClickableServiceCard
            key={subcategory.slug}
            href={`/servicios/${category.slug}/${subcategory.slug}`}
            title={subcategory.label}
            description={subcategory.description}
            icon={Icon}
            meta={<span className="browseCardMeta">{subcategory.referencePrice}</span>}
          />
        ))}
      </div>
    </ServiceBrowseShell>
  );
}
