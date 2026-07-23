import { ClickableServiceCard } from "@/components/services/ClickableServiceCard";
import { ServiceBrowseShell } from "@/components/services/ServiceBrowseShell";
import { buildCategoriesIndexMetadata } from "@/lib/categories/seo";
import {
  buildCategoryHref,
  countLeafSpecialties,
  getSortedRootCategories,
} from "@/lib/categories/hierarchy";
import { getCategoryIconByKey } from "@/lib/services/icons";

export const metadata = buildCategoriesIndexMetadata();

export default function CategoriasPage() {
  const categories = getSortedRootCategories();

  return (
    <ServiceBrowseShell
      title="Elegir categoría manualmente"
      description="Explora todas las categorías de servicio, entra a subcategorías y especialidades con perfiles verificados."
      kicker="NAVEGACIÓN MANUAL"
    >
      <div className="browseGrid">
        {categories.map((category) => {
          const Icon = getCategoryIconByKey(category.icon);
          return (
            <ClickableServiceCard
              key={category.slug}
              href={buildCategoryHref([category.slug])}
              title={category.name}
              description={category.summary ?? category.description ?? category.name}
              icon={Icon}
              meta={
                <span className="browseCardMeta">
                  {countLeafSpecialties(category)} especialidades
                </span>
              }
            />
          );
        })}
      </div>
    </ServiceBrowseShell>
  );
}
