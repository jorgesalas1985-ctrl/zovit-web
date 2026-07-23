import { ClickableServiceCard } from "@/components/services/ClickableServiceCard";
import { ServiceBrowseShell } from "@/components/services/ServiceBrowseShell";
import { SERVICE_BROWSE_CATALOG } from "@/lib/services/catalog";
import { getCategoryIcon } from "@/lib/services/icons";

export default function ServiciosPage() {
  return (
    <ServiceBrowseShell
      title="Elegir categoría manualmente"
      description="Explora todas las categorías de servicio, entra a una subcategoría y solicita ayuda sin usar la IA."
      kicker="NAVEGACIÓN MANUAL"
    >
      <div className="browseGrid">
        {SERVICE_BROWSE_CATALOG.map((category) => {
          const Icon = getCategoryIcon(category.name);
          return (
            <ClickableServiceCard
              key={category.slug}
              href={`/servicios/${category.slug}`}
              title={category.name}
              description={category.summary}
              icon={Icon}
              meta={
                <span className="browseCardMeta">
                  {category.subcategories.length} subcategorías
                </span>
              }
            />
          );
        })}
      </div>
    </ServiceBrowseShell>
  );
}
