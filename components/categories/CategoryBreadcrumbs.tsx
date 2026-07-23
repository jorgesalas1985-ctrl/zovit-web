import Link from "next/link";
import type { CategoryPathSegment } from "@/lib/categories/hierarchy";
import { ChevronRight } from "lucide-react";

type Props = {
  segments: CategoryPathSegment[];
};

export function CategoryBreadcrumbs({ segments }: Props) {
  const current = segments[segments.length - 1];

  return (
    <nav className="categoryBreadcrumbs" aria-label="Migas de pan">
      <ol>
        {segments.map((segment, index) => {
          const isCurrent = segment.slug === current.slug && index === segments.length - 1;

          return (
            <li key={`${segment.slug}-${index}`}>
              {isCurrent ? (
                <span aria-current="page">{segment.name}</span>
              ) : (
                <Link href={segment.href}>{segment.name}</Link>
              )}
              {!isCurrent && (
                <ChevronRight size={14} aria-hidden="true" className="categoryBreadcrumbSep" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
