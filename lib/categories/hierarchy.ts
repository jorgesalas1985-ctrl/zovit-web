import { CATEGORY_TREE, type CategoryNode } from "@/lib/data/categories";

export type CategoryPathSegment = {
  name: string;
  slug: string;
  href: string;
};

export type ResolvedCategoryPath = {
  nodes: CategoryNode[];
  leaf: CategoryNode;
  root: CategoryNode;
};

function compareSpanish(a: string, b: string) {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

export function sortCategoryNodes<T extends { name: string }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => compareSpanish(a.name, b.name));
}

export function getSortedRootCategories(): CategoryNode[] {
  return sortCategoryNodes(CATEGORY_TREE);
}

export function getRootCategoryBySlug(slug: string): CategoryNode | undefined {
  return CATEGORY_TREE.find((category) => category.slug === slug);
}

export function getChildren(node: CategoryNode): CategoryNode[] {
  return sortCategoryNodes(node.children ?? []);
}

export function isLeafNode(node: CategoryNode): boolean {
  return !node.children || node.children.length === 0;
}

export function countLeafSpecialties(node: CategoryNode): number {
  if (isLeafNode(node)) return 1;
  return (node.children ?? []).reduce((total, child) => total + countLeafSpecialties(child), 0);
}

export function buildCategoryHref(slugs: string[]): string {
  return `/categorias/${slugs.join("/")}`;
}

export function resolveCategoryPath(slugs: string[]): ResolvedCategoryPath | undefined {
  if (slugs.length === 0) return undefined;

  const root = getRootCategoryBySlug(slugs[0]);
  if (!root) return undefined;

  const nodes: CategoryNode[] = [root];
  let current = root;

  for (let index = 1; index < slugs.length; index += 1) {
    const next = current.children?.find((child) => child.slug === slugs[index]);
    if (!next) return undefined;
    nodes.push(next);
    current = next;
  }

  return { nodes, leaf: current, root };
}

export function findPathToSlug(root: CategoryNode, targetSlug: string): CategoryNode[] | undefined {
  function walk(node: CategoryNode, trail: CategoryNode[]): CategoryNode[] | undefined {
    const nextTrail = [...trail, node];
    if (node.slug === targetSlug) return nextTrail;

    for (const child of node.children ?? []) {
      const match = walk(child, nextTrail);
      if (match) return match;
    }

    return undefined;
  }

  return walk(root, []);
}

export function resolveLegacyServiciosPath(
  categorySlug: string,
  specialtySlug?: string,
): string | undefined {
  const root = getRootCategoryBySlug(categorySlug);
  if (!root) return undefined;
  if (!specialtySlug) return buildCategoryHref([root.slug]);

  const path = findPathToSlug(root, specialtySlug);
  if (!path || path.length < 2) return undefined;

  return buildCategoryHref(path.map((node) => node.slug));
}

export function getBreadcrumbSegments(resolved: ResolvedCategoryPath): CategoryPathSegment[] {
  const segments: CategoryPathSegment[] = [
    { name: "Inicio", slug: "inicio", href: "/" },
    { name: "Categorías", slug: "categorias", href: "/categorias" },
  ];

  resolved.nodes.forEach((node, index) => {
    segments.push({
      name: node.name,
      slug: node.slug,
      href: buildCategoryHref(resolved.nodes.slice(0, index + 1).map((item) => item.slug)),
    });
  });

  return segments;
}

export function getSearchParamsForLeaf(resolved: ResolvedCategoryPath) {
  const { leaf, root } = resolved;
  return {
    category: leaf.searchCategory ?? root.searchCategory ?? root.name,
    specialty: leaf.searchSpecialty ?? leaf.name,
    referencePrice: leaf.referencePrice ?? "Precio referencial a confirmar con el profesional",
  };
}

export function getFeaturedRootCategories(limit = 5): CategoryNode[] {
  return sortCategoryNodes(CATEGORY_TREE.filter((category) => category.featured)).slice(0, limit);
}

export function filterRootCategories(query: string): CategoryNode[] {
  const normalized = query.trim().toLowerCase();
  const sorted = getSortedRootCategories();
  if (!normalized) return sorted;

  return sorted.filter((category) => category.name.toLowerCase().includes(normalized));
}

export function shouldShowLegalNotice(resolved: ResolvedCategoryPath): boolean {
  return resolved.nodes.some((node) => node.requiresLegalNotice);
}

export function getNodeHref(root: CategoryNode, node: CategoryNode): string {
  const path = findPathToSlug(root, node.slug);
  if (!path) return buildCategoryHref([root.slug]);
  return buildCategoryHref(path.map((item) => item.slug));
}
