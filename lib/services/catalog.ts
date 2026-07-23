import { SERVICE_CATALOG } from "@/lib/ai/serviceCatalog";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/categories";

export type SubcategoryDefinition = {
  id: string;
  slug: string;
  label: string;
  description: string;
  referencePrice: string;
  availability: string;
};

export type CategoryBrowseDefinition = {
  name: ServiceCategory;
  slug: string;
  summary: string;
  description: string;
  subcategories: SubcategoryDefinition[];
};

const CATEGORY_META: Record<
  ServiceCategory,
  { summary: string; description: string }
> = {
  Hogar: {
    summary: "Electricidad, gasfitería, cerrajería y climatización.",
    description: "Profesionales verificados para reparaciones y mantención en tu hogar.",
  },
  Automotriz: {
    summary: "Mecánica, electricidad automotriz y diagnóstico.",
    description: "Especialistas conectados para resolver fallas y mantención de vehículos.",
  },
  Construcción: {
    summary: "Obras, terminaciones, pintura y albañilería.",
    description: "Encuentra profesionales para proyectos de construcción y remodelación.",
  },
  Tecnología: {
    summary: "Soporte PC, redes e internet.",
    description: "Técnicos para equipos, conectividad y soluciones digitales.",
  },
  Jardinería: {
    summary: "Mantención, poda y cuidado de áreas verdes.",
    description: "Servicios de jardinería y paisajismo para hogares y empresas.",
  },
  Limpieza: {
    summary: "Limpieza profunda y mantención de espacios.",
    description: "Profesionales para aseo domiciliario, oficinas y post-obra.",
  },
  "Transporte de carga": {
    summary: "Fletes, mudanzas y traslado de carga.",
    description: "Conductores y equipos para mover muebles, carga y mudanzas.",
  },
  Salud: {
    summary: "Atención domiciliaria y cuidados especializados.",
    description: "Profesionales de salud para apoyo en el hogar.",
  },
  Educación: {
    summary: "Apoyo escolar y clases particulares.",
    description: "Docentes y tutores para reforzar aprendizaje.",
  },
  Profesionales: {
    summary: "Asesoría legal, contable y servicios especializados.",
    description: "Expertos para consultas profesionales y trámites.",
  },
};

const REFERENCE_PRICES: Record<string, string> = {
  "electricidad-domiciliaria": "Desde $25.000 · visita técnica",
  gasfiteria: "Desde $22.000 · revisión inicial",
  climatizacion: "Desde $30.000 · diagnóstico",
  cerrajeria: "Desde $18.000 · apertura o cambio",
  "electricidad-automotriz": "Desde $35.000 · diagnóstico eléctrico",
  "mecanica-general": "Desde $40.000 · revisión mecánica",
  "diagnostico-computacional": "Desde $25.000 · escaneo OBD",
  "aire-acondicionado-auto": "Desde $45.000 · carga o revisión",
  pintura: "Desde $120.000 · según m²",
  albanileria: "Desde $80.000 · según proyecto",
  "electricidad-obra": "Desde $60.000 · según instalación",
  "soporte-pc": "Desde $15.000 · soporte remoto o visita",
  redes: "Desde $20.000 · configuración básica",
  "mantencion-jardines": "Desde $18.000 · por visita",
  "limpieza-profunda": "Desde $35.000 · según espacio",
  fletes: "Desde $45.000 · según distancia",
  "atencion-domiciliaria": "Desde $30.000 · por hora",
  "apoyo-escolar": "Desde $12.000 · por hora",
  "asesoria-legal": "Desde $40.000 · consulta inicial",
};

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildSubcategory(
  category: ServiceCategory,
  id: string,
  label: string,
): SubcategoryDefinition {
  return {
    id,
    slug: id,
    label,
    description: `Servicio profesional de ${label.toLowerCase()} en ${category}. Profesionales verificados con historial respaldado por ZOVIT.`,
    referencePrice: REFERENCE_PRICES[id] ?? "Precio referencial a confirmar con el profesional",
    availability: "Profesionales conectados en ZOVIT",
  };
}

export const SERVICE_BROWSE_CATALOG: CategoryBrowseDefinition[] = SERVICE_CATEGORIES.map(
  (name) => {
    const catalog = SERVICE_CATALOG.find((item) => item.category === name);
    const meta = CATEGORY_META[name];

    return {
      name,
      slug: slugify(name),
      summary: meta.summary,
      description: meta.description,
      subcategories: (catalog?.specialties ?? []).map((specialty) =>
        buildSubcategory(name, specialty.id, specialty.label),
      ),
    };
  },
);

export function getCategoryBySlug(slug: string): CategoryBrowseDefinition | undefined {
  return SERVICE_BROWSE_CATALOG.find((category) => category.slug === slug);
}

export function getSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string,
): { category: CategoryBrowseDefinition; subcategory: SubcategoryDefinition } | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;

  const subcategory = category.subcategories.find((item) => item.slug === subcategorySlug);
  if (!subcategory) return undefined;

  return { category, subcategory };
}

export function getFeaturedCategories(limit = 5): CategoryBrowseDefinition[] {
  return SERVICE_BROWSE_CATALOG.slice(0, limit);
}
