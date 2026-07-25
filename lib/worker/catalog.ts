import { getSortedRootCategories } from "@/lib/categories/hierarchy";
import { specialtyRequiresCredential } from "@/lib/worker/regulatedServices";

export type WorkerSpecialtyOption = {
  categorySlug: string;
  categoryName: string;
  specialtySlug: string;
  specialtyName: string;
  requiresCredential: boolean;
};

export function listWorkerSpecialtyOptions(): WorkerSpecialtyOption[] {
  const options: WorkerSpecialtyOption[] = [];

  for (const root of getSortedRootCategories()) {
    function walk(node: typeof root, categorySlug: string, categoryName: string) {
      if (!node.children?.length) {
        options.push({
          categorySlug,
          categoryName,
          specialtySlug: node.slug,
          specialtyName: node.name,
          requiresCredential: specialtyRequiresCredential(node.slug, node.name),
        });
        return;
      }
      node.children.forEach((child) => walk(child, categorySlug, categoryName));
    }

    root.children?.forEach((child) => walk(child, root.slug, root.name));
  }

  return options;
}
