import { CategoryBreadcrumbs } from "@/components/categories/CategoryBreadcrumbs";
import { CategoryChildrenGrid } from "@/components/categories/CategoryChildrenGrid";
import { InstitutionLegalNotice } from "@/components/categories/InstitutionLegalNotice";
import { ServiceBrowseShell } from "@/components/services/ServiceBrowseShell";
import {
  getBreadcrumbSegments,
  shouldShowLegalNotice,
  type ResolvedCategoryPath,
} from "@/lib/categories/hierarchy";
import { getCategoryIconByKey } from "@/lib/services/icons";

type Props = {
  resolved: ResolvedCategoryPath;
  institutionLayout?: boolean;
  listTitle?: string;
};

export function CategoryListingPage({ resolved, institutionLayout, listTitle }: Props) {
  const { leaf, root } = resolved;
  const breadcrumbs = getBreadcrumbSegments(resolved);
  const Icon = getCategoryIconByKey(leaf.icon ?? root.icon);

  return (
    <ServiceBrowseShell
      title={leaf.name}
      description={leaf.description ?? leaf.summary}
      kicker={root.name.toUpperCase()}
      breadcrumbs={<CategoryBreadcrumbs segments={breadcrumbs} />}
    >
      {shouldShowLegalNotice(resolved) && <InstitutionLegalNotice />}

      <div className="browseIntroCard">
        <div className="browseCardIcon">
          <Icon size={22} />
        </div>
        <div>
          <h2>{leaf.name}</h2>
          <p>{leaf.summary ?? leaf.description}</p>
        </div>
      </div>

      <div className="browseSectionHeading">
        <h2>{listTitle ?? (institutionLayout ? "Instituciones disponibles" : "Explora servicios")}</h2>
      </div>

      <CategoryChildrenGrid
        parent={leaf}
        root={root}
        resolved={resolved}
        institutionLayout={institutionLayout}
      />
    </ServiceBrowseShell>
  );
}
