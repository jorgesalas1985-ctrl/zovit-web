import type { MetadataRoute } from "next";
import type { CategoryNode } from "@/lib/data/categories";
import {
  buildCategoryHref,
  getSortedRootCategories,
} from "@/lib/categories/hierarchy";
import { getSiteUrl } from "@/lib/seo/site";

function collectCategoryPaths(node: CategoryNode, trail: string[], out: string[]) {
  const nextTrail = [...trail, node.slug];
  out.push(buildCategoryHref(nextTrail));
  for (const child of node.children ?? []) {
    collectCategoryPaths(child, nextTrail, out);
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/categorias`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/registro`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/seguridad`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${siteUrl}/por-que-zovit`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    {
      url: `${siteUrl}/profesionales-verificados`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    { url: `${siteUrl}/ia`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${siteUrl}/ayuda`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/legal/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/legal/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/legal/seguridad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/legal/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryPaths: string[] = [];
  for (const root of getSortedRootCategories()) {
    collectCategoryPaths(root, [], categoryPaths);
  }

  const categoryRoutes: MetadataRoute.Sitemap = categoryPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path.split("/").length <= 3 ? 0.8 : 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes];
}
