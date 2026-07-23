"use client";

import { ClickableServiceCard } from "@/components/services/ClickableServiceCard";
import {
  buildCategoryHref,
  countLeafSpecialties,
  getChildren,
  getNodeHref,
  isLeafNode,
  type ResolvedCategoryPath,
} from "@/lib/categories/hierarchy";
import type { CategoryNode } from "@/lib/data/categories";
import { getCategoryIconByKey } from "@/lib/services/icons";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type Props = {
  parent: CategoryNode;
  root: CategoryNode;
  resolved: ResolvedCategoryPath;
  institutionLayout?: boolean;
};

export function CategoryChildrenGrid({ parent, root, resolved, institutionLayout }: Props) {
  const children = getChildren(parent);

  if (children.length === 0) {
    return null;
  }

  return (
    <div className={institutionLayout ? "browseGrid institutionGrid" : "browseGrid"}>
      {children.map((child) => {
        const Icon = getCategoryIconByKey(child.icon ?? root.icon ?? parent.icon);
        const href = isLeafNode(child)
          ? buildCategoryHref([...resolved.nodes.map((node) => node.slug), child.slug])
          : getNodeHref(root, child);
        const specialtyCount = countLeafSpecialties(child);

        if (institutionLayout) {
          return (
            <article key={child.slug} className="institutionCard">
              <div className="institutionCardIcon">
                <Icon size={24} aria-hidden="true" />
              </div>
              <div className="institutionCardBody">
                <h3>{child.name}</h3>
                <p>{child.description}</p>
                {specialtyCount > 0 && (
                  <span className="browseCardMeta">{specialtyCount} especialidades</span>
                )}
              </div>
              <Link href={href} className="primaryButton institutionCardButton">
                Ver servicios <ArrowRight size={16} />
              </Link>
            </article>
          );
        }

        return (
          <ClickableServiceCard
            key={child.slug}
            href={href}
            title={child.name}
            description={child.description ?? child.name}
            icon={Icon}
            meta={
              !isLeafNode(child) ? (
                <span className="browseCardMeta">{specialtyCount} especialidades</span>
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
