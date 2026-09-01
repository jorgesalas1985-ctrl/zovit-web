import type { CategoryNode } from "@/features/categories/types";
import {
  getCanonicalCategoryById,
  getCanonicalSpecialty,
} from "@/features/categories/catalog";
import { SERVICE_CATALOG } from "@/lib/ai/serviceCatalog";
import { slugify } from "@/lib/utils/slugify";

export type { CategoryNode } from "@/features/categories/types";

const SHARED_INSTITUTION_SPECIALTIES = [
  "recursos-administrativos",
  "defensa-funcionaria",
  "asesoria-previsional",
  "pensiones-y-retiros",
  "orientacion-para-personal-activo",
  "orientacion-para-personal-en-retiro",
  "otros-servicios-relacionados",
] as const;

function specialtyLeaf(
  id: string,
  searchCategory: string,
  description?: string,
): CategoryNode {
  const specialty = getCanonicalSpecialty(id);
  if (!specialty) {
    throw new Error(`Identidad canónica inválida para la especialidad ${id}.`);
  }

  return {
    id: specialty.id,
    name: specialty.name,
    slug: specialty.slug,
    description:
      description ??
      `Encuentra profesionales con experiencia en ${specialty.name.toLowerCase()} y perfiles verificados en ZOVIT.`,
    searchCategory,
    searchSpecialty: specialty.name,
    referencePrice: "Precio referencial a confirmar con el profesional",
  };
}

function groupNode(
  id: string,
  name: string,
  searchCategory: string,
  specialties: { id: string }[],
  description?: string,
): CategoryNode {
  return {
    id,
    name,
    slug: slugify(name),
    description,
    searchCategory,
    children: specialties.map((item) => specialtyLeaf(item.id, searchCategory)),
  };
}

function buildInstitutionSpecialties(
  searchCategory: string,
  escritosId: string,
): CategoryNode[] {
  const escritos = getCanonicalSpecialty(escritosId);
  if (!escritos) {
    throw new Error(`Identidad canónica inválida para la especialidad ${escritosId}.`);
  }

  return [
    specialtyLeaf(
      escritos.id,
      searchCategory,
      `Profesionales con experiencia en ${escritos.name.toLowerCase()} y trámites relacionados.`,
    ),
    ...SHARED_INSTITUTION_SPECIALTIES.map((id) =>
      specialtyLeaf(id, searchCategory),
    ),
  ];
}

function institutionNode(
  id: string,
  name: string,
  description: string,
  icon: string,
  escritosId: string,
  searchCategory: string,
): CategoryNode {
  const children = buildInstitutionSpecialties(searchCategory, escritosId);
  return {
    id,
    name,
    slug: id,
    description,
    icon,
    searchCategory,
    children,
  };
}

function buildLegacyGroups(
  searchCategory: string,
  groups: { id: string; name: string; specialties: { id: string }[] }[],
): CategoryNode[] {
  return groups.map((group) =>
    groupNode(group.id, group.name, searchCategory, group.specialties, group.name),
  );
}

function legacyRootFromCatalog(
  categoryId: string,
  summary: string,
  description: string,
  icon: string,
  featured: boolean,
  groups: { id: string; name: string; specialties: { id: string }[] }[],
): CategoryNode {
  const category = getCanonicalCategoryById(categoryId);
  if (!category) {
    throw new Error(`Identidad canónica inválida para la categoría ${categoryId}.`);
  }

  const catalog = SERVICE_CATALOG.find((item) => item.category === category.name);
  const fallbackSpecialties = catalog?.specialties ?? [];

  const children =
    groups.length > 0
      ? buildLegacyGroups(category.name, groups)
      : fallbackSpecialties.map((specialty) => specialtyLeaf(specialty.id, category.name));

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    summary,
    description,
    icon,
    featured,
    searchCategory: category.name,
    children,
  };
}

const FUERZAS_CATEGORY = getCanonicalCategoryById("fuerzas-armadas-orden-seguridad");
if (!FUERZAS_CATEGORY) {
  throw new Error("Identidad canónica inválida para fuerzas-armadas-orden-seguridad.");
}

export const CATEGORY_TREE: CategoryNode[] = [
  legacyRootFromCatalog(
    "automotriz",
    "Mecánica, electricidad automotriz y scanner.",
    "Especialistas conectados para resolver fallas y mantención de vehículos.",
    "car",
    true,
    [
      {
        id: "electricidad-automotriz",
        name: "Electricidad automotriz",
        specialties: [{ id: "electricidad-automotriz" }],
      },
      {
        id: "mecanica",
        name: "Mecánica general",
        specialties: [{ id: "mecanica-general" }],
      },
      {
        id: "scanner",
        name: "Scanner",
        specialties: [
          { id: "scanner-motocicletas" },
          { id: "scanner-automotriz" },
          { id: "scanner-maquinaria-pesada" },
        ],
      },
      {
        id: "climatizacion-auto",
        name: "Aire acondicionado automotriz",
        specialties: [{ id: "aire-acondicionado-auto" }],
      },
    ],
  ),
  {
    id: "auxiliar-de-aseo",
    name: "Auxiliar de Aseo",
    slug: "auxiliar-de-aseo",
    summary: "Aseo domiciliario, oficinas, limpieza profunda y sanitización.",
    description: "Profesionales de aseo y limpieza para hogares, oficinas y espacios comerciales.",
    icon: "sparkles",
    searchCategory: "Auxiliar de Aseo",
    children: [
      "aseo-domiciliario",
      "aseo-de-oficinas",
      "limpieza-profunda",
      "limpieza-despues-de-obras",
      "limpieza-de-vidrios",
      "aseo-de-condominios",
      "sanitizacion",
      "apoyo-de-aseo-por-horas",
    ].map((id) => specialtyLeaf(id, "Auxiliar de Aseo")),
  },
  legacyRootFromCatalog(
    "construccion",
    "Obras, terminaciones, pintura y albañilería.",
    "Encuentra profesionales para proyectos de construcción y remodelación.",
    "hammer",
    true,
    [
      {
        id: "pintura-terminaciones",
        name: "Pintura y terminaciones",
        specialties: [{ id: "pintura" }],
      },
      {
        id: "albanileria",
        name: "Albañilería",
        specialties: [{ id: "albanileria" }],
      },
      {
        id: "electricidad",
        name: "Electricidad",
        specialties: [{ id: "electricidad-obra" }],
      },
    ],
  ),
  {
    id: "educacion",
    name: "Educación",
    slug: "educacion",
    summary: "Tutorías, ayudantías, clases online y particulares.",
    description: "Docentes y tutores para reforzar aprendizaje presencial u online.",
    icon: "book",
    featured: false,
    searchCategory: "Educación",
    children: [
      groupNode(
        "tutorias",
        "Tutorías",
        "Educación",
        [
          { id: "tutorias-matematicas" },
          { id: "tutorias-lenguaje" },
          { id: "tutorias-ciencias-naturales" },
          { id: "tutorias-historia" },
          { id: "tutorias-ingles" },
          { id: "tutorias-paes" },
          { id: "tutorias-lectoescritura" },
          { id: "tutorias-tareas" },
        ],
        "Refuerzo académico personalizado por materia, presencial u online.",
      ),
      specialtyLeaf(
        "ayudantias",
        "Educación",
        "Apoyo universitario en ramos, guías y evaluaciones, presencial u online.",
      ),
      groupNode(
        "clases-online",
        "Clases online",
        "Educación",
        [
          { id: "clases-online-matematicas" },
          { id: "clases-online-lenguaje" },
          { id: "clases-online-ciencias" },
          { id: "clases-online-ingles" },
          { id: "clases-online-paes" },
          { id: "clases-online-apoyo-escolar" },
        ],
        "Clases a distancia con docentes y tutores verificados en Chile.",
      ),
      specialtyLeaf(
        "clases-particulares-docentes-profesionales",
        "Educación",
        "Clases particulares con docentes titulados y experiencia en aula, presencial u online.",
      ),
    ],
  },
  {
    id: "fuerzas-armadas-orden-seguridad",
    name: FUERZAS_CATEGORY.name,
    slug: FUERZAS_CATEGORY.slug,
    summary: "Servicios profesionales relacionados con instituciones uniformadas.",
    description:
      "Servicios profesionales relacionados con instituciones uniformadas de Chile. ZOVIT es una plataforma independiente.",
    icon: "shield",
    requiresLegalNotice: true,
    searchCategory: FUERZAS_CATEGORY.name,
    children: [
      institutionNode(
        "ejercito",
        "Ejército de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal del Ejército.",
        "building",
        "escritos-al-ejercito",
        FUERZAS_CATEGORY.name,
      ),
      institutionNode(
        "armada",
        "Armada de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de la Armada.",
        "ship",
        "escritos-a-la-armada",
        FUERZAS_CATEGORY.name,
      ),
      institutionNode(
        "fuerza-aerea",
        "Fuerza Aérea de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de la Fuerza Aérea.",
        "plane",
        "escritos-a-la-fuerza-aerea",
        FUERZAS_CATEGORY.name,
      ),
      institutionNode(
        "carabineros",
        "Carabineros de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de Carabineros.",
        "shield",
        "escritos-a-carabineros",
        FUERZAS_CATEGORY.name,
      ),
      institutionNode(
        "pdi",
        "Policía de Investigaciones de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de la PDI.",
        "badge",
        "escritos-a-la-pdi",
        FUERZAS_CATEGORY.name,
      ),
      institutionNode(
        "gendarmeria",
        "Gendarmería de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de Gendarmería.",
        "shield-check",
        "escritos-a-gendarmeria",
        FUERZAS_CATEGORY.name,
      ),
    ],
  },
  legacyRootFromCatalog(
    "hogar",
    "Electricidad, gasfitería, cerrajería y climatización.",
    "Profesionales verificados para reparaciones y mantención en tu hogar.",
    "home",
    true,
    [
      {
        id: "electricidad",
        name: "Electricidad",
        specialties: [{ id: "electricidad-domiciliaria" }],
      },
      {
        id: "gasfiteria",
        name: "Gasfitería",
        specialties: [{ id: "gasfiteria" }],
      },
      {
        id: "climatizacion",
        name: "Climatización",
        specialties: [{ id: "climatizacion" }],
      },
      {
        id: "cerrajeria",
        name: "Cerrajería",
        specialties: [{ id: "cerrajeria" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "jardineria",
    "Mantención, poda y cuidado de áreas verdes.",
    "Servicios de jardinería y paisajismo para hogares y empresas.",
    "flower",
    true,
    [
      {
        id: "mantencion",
        name: "Mantención de jardines",
        specialties: [{ id: "mantencion-jardines" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "limpieza",
    "Limpieza profunda y mantención de espacios.",
    "Profesionales para aseo domiciliario, oficinas y post-obra.",
    "sparkles",
    false,
    [
      {
        id: "limpieza-profunda",
        name: "Limpieza profunda",
        specialties: [{ id: "limpieza-profunda" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "profesionales",
    "Asesoría legal, contable y servicios especializados.",
    "Expertos para consultas profesionales y trámites.",
    "briefcase",
    false,
    [
      {
        id: "asesoria",
        name: "Asesoría especializada",
        specialties: [{ id: "asesoria-legal" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "salud",
    "Atención domiciliaria y cuidados especializados.",
    "Profesionales de salud para apoyo en el hogar.",
    "heart",
    false,
    [
      {
        id: "atencion-domiciliaria",
        name: "Atención domiciliaria",
        specialties: [{ id: "atencion-domiciliaria" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "tecnologia",
    "Soporte PC, redes e internet.",
    "Técnicos para equipos, conectividad y soluciones digitales.",
    "laptop",
    true,
    [
      {
        id: "soporte",
        name: "Soporte técnico",
        specialties: [{ id: "soporte-pc" }],
      },
      {
        id: "redes",
        name: "Redes e internet",
        specialties: [{ id: "redes" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "transporte-de-carga",
    "Fletes, mudanzas y traslado de carga.",
    "Conductores y equipos para mover muebles, carga y mudanzas.",
    "truck",
    false,
    [
      {
        id: "fletes",
        name: "Fletes y mudanzas",
        specialties: [{ id: "fletes" }],
      },
    ],
  ),
];
