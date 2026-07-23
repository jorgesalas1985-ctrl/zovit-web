import { SERVICE_CATALOG } from "@/lib/ai/serviceCatalog";
import { slugify } from "@/lib/utils/slugify";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  summary?: string;
  icon?: string;
  featured?: boolean;
  requiresLegalNotice?: boolean;
  searchCategory?: string;
  searchSpecialty?: string;
  referencePrice?: string;
  children?: CategoryNode[];
};

const SHARED_INSTITUTION_SPECIALTIES = [
  "Recursos administrativos",
  "Defensa funcionaria",
  "Asesoría previsional",
  "Pensiones y retiros",
  "Orientación para personal activo",
  "Orientación para personal en retiro",
  "Otros servicios relacionados",
] as const;

function specialtyLeaf(
  id: string,
  label: string,
  searchCategory: string,
  description?: string,
): CategoryNode {
  return {
    id,
    name: label,
    slug: id,
    description:
      description ??
      `Encuentra profesionales con experiencia en ${label.toLowerCase()} y perfiles verificados en ZOVIT.`,
    searchCategory,
    searchSpecialty: label,
    referencePrice: "Precio referencial a confirmar con el profesional",
  };
}

function groupNode(
  id: string,
  name: string,
  searchCategory: string,
  specialties: { id: string; label: string }[],
  description?: string,
): CategoryNode {
  return {
    id,
    name,
    slug: slugify(name),
    description,
    searchCategory,
    children: specialties.map((item) => specialtyLeaf(item.id, item.label, searchCategory)),
  };
}

function buildInstitutionSpecialties(
  searchCategory: string,
  escritosLabel: string,
): CategoryNode[] {
  const escritosSlug = slugify(escritosLabel);
  return [
    specialtyLeaf(
      escritosSlug,
      escritosLabel,
      searchCategory,
      `Profesionales con experiencia en ${escritosLabel.toLowerCase()} y trámites relacionados.`,
    ),
    ...SHARED_INSTITUTION_SPECIALTIES.map((name) =>
      specialtyLeaf(slugify(name), name, searchCategory),
    ),
  ];
}

function institutionNode(
  id: string,
  name: string,
  description: string,
  icon: string,
  escritosLabel: string,
  searchCategory: string,
): CategoryNode {
  const children = buildInstitutionSpecialties(searchCategory, escritosLabel);
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
  groups: { id: string; name: string; specialties: { id: string; label: string }[] }[],
): CategoryNode[] {
  return groups.map((group) =>
    groupNode(group.id, group.name, searchCategory, group.specialties, group.name),
  );
}

function legacyRootFromCatalog(
  name: string,
  slug: string,
  summary: string,
  description: string,
  icon: string,
  featured: boolean,
  groups: { id: string; name: string; specialties: { id: string; label: string }[] }[],
): CategoryNode {
  const catalog = SERVICE_CATALOG.find((item) => item.category === name);
  const fallbackSpecialties = catalog?.specialties ?? [];

  const children =
    groups.length > 0
      ? buildLegacyGroups(name, groups)
      : fallbackSpecialties.map((specialty) => specialtyLeaf(specialty.id, specialty.label, name));

  return {
    id: slug,
    name,
    slug,
    summary,
    description,
    icon,
    featured,
    searchCategory: name,
    children,
  };
}

const FUERZAS_CATEGORY_NAME = "Fuerzas Armadas, de Orden y Seguridad";

export const CATEGORY_TREE: CategoryNode[] = [
  legacyRootFromCatalog(
    "Automotriz",
    "automotriz",
    "Mecánica, electricidad automotriz y diagnóstico.",
    "Especialistas conectados para resolver fallas y mantención de vehículos.",
    "car",
    true,
    [
      {
        id: "electricidad-automotriz",
        name: "Electricidad automotriz",
        specialties: [{ id: "electricidad-automotriz", label: "Electricidad automotriz" }],
      },
      {
        id: "mecanica",
        name: "Mecánica general",
        specialties: [{ id: "mecanica-general", label: "Mecánica general" }],
      },
      {
        id: "diagnostico",
        name: "Diagnóstico computacional",
        specialties: [{ id: "diagnostico-computacional", label: "Diagnóstico computacional" }],
      },
      {
        id: "climatizacion-auto",
        name: "Aire acondicionado automotriz",
        specialties: [{ id: "aire-acondicionado-auto", label: "Aire acondicionado automotriz" }],
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
      "Aseo domiciliario",
      "Aseo de oficinas",
      "Limpieza profunda",
      "Limpieza después de obras",
      "Limpieza de vidrios",
      "Aseo de condominios",
      "Sanitización",
      "Apoyo de aseo por horas",
    ].map((label) => specialtyLeaf(slugify(label), label, "Auxiliar de Aseo")),
  },
  legacyRootFromCatalog(
    "Construcción",
    "construccion",
    "Obras, terminaciones, pintura y albañilería.",
    "Encuentra profesionales para proyectos de construcción y remodelación.",
    "hammer",
    true,
    [
      {
        id: "pintura-terminaciones",
        name: "Pintura y terminaciones",
        specialties: [{ id: "pintura", label: "Pintura" }],
      },
      {
        id: "albanileria",
        name: "Albañilería",
        specialties: [{ id: "albanileria", label: "Albañilería" }],
      },
      {
        id: "electricidad",
        name: "Electricidad",
        specialties: [{ id: "electricidad-obra", label: "Instalaciones eléctricas en obra" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "Educación",
    "educacion",
    "Apoyo escolar y clases particulares.",
    "Docentes y tutores para reforzar aprendizaje.",
    "book",
    false,
    [
      {
        id: "apoyo-escolar",
        name: "Apoyo escolar",
        specialties: [{ id: "apoyo-escolar", label: "Apoyo escolar" }],
      },
    ],
  ),
  {
    id: "fuerzas-armadas-orden-seguridad",
    name: FUERZAS_CATEGORY_NAME,
    slug: "fuerzas-armadas-orden-seguridad",
    summary: "Servicios profesionales relacionados con instituciones uniformadas.",
    description:
      "Servicios profesionales relacionados con instituciones uniformadas de Chile. ZOVIT es una plataforma independiente.",
    icon: "shield",
    requiresLegalNotice: true,
    searchCategory: FUERZAS_CATEGORY_NAME,
    children: [
      institutionNode(
        "ejercito",
        "Ejército de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal del Ejército.",
        "building",
        "Escritos al Ejército",
        FUERZAS_CATEGORY_NAME,
      ),
      institutionNode(
        "armada",
        "Armada de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de la Armada.",
        "ship",
        "Escritos a la Armada",
        FUERZAS_CATEGORY_NAME,
      ),
      institutionNode(
        "fuerza-aerea",
        "Fuerza Aérea de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de la Fuerza Aérea.",
        "plane",
        "Escritos a la Fuerza Aérea",
        FUERZAS_CATEGORY_NAME,
      ),
      institutionNode(
        "carabineros",
        "Carabineros de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de Carabineros.",
        "shield",
        "Escritos a Carabineros",
        FUERZAS_CATEGORY_NAME,
      ),
      institutionNode(
        "pdi",
        "Policía de Investigaciones de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de la PDI.",
        "badge",
        "Escritos a la PDI",
        FUERZAS_CATEGORY_NAME,
      ),
      institutionNode(
        "gendarmeria",
        "Gendarmería de Chile",
        "Servicios profesionales vinculados a trámites y orientación para personal de Gendarmería.",
        "shield-check",
        "Escritos a Gendarmería",
        FUERZAS_CATEGORY_NAME,
      ),
    ],
  },
  legacyRootFromCatalog(
    "Hogar",
    "hogar",
    "Electricidad, gasfitería, cerrajería y climatización.",
    "Profesionales verificados para reparaciones y mantención en tu hogar.",
    "home",
    true,
    [
      {
        id: "electricidad",
        name: "Electricidad",
        specialties: [{ id: "electricidad-domiciliaria", label: "Electricidad domiciliaria" }],
      },
      {
        id: "gasfiteria",
        name: "Gasfitería",
        specialties: [{ id: "gasfiteria", label: "Gasfitería" }],
      },
      {
        id: "climatizacion",
        name: "Climatización",
        specialties: [{ id: "climatizacion", label: "Climatización" }],
      },
      {
        id: "cerrajeria",
        name: "Cerrajería",
        specialties: [{ id: "cerrajeria", label: "Cerrajería" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "Jardinería",
    "jardineria",
    "Mantención, poda y cuidado de áreas verdes.",
    "Servicios de jardinería y paisajismo para hogares y empresas.",
    "flower",
    true,
    [
      {
        id: "mantencion",
        name: "Mantención de jardines",
        specialties: [{ id: "mantencion-jardines", label: "Mantención de jardines" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "Limpieza",
    "limpieza",
    "Limpieza profunda y mantención de espacios.",
    "Profesionales para aseo domiciliario, oficinas y post-obra.",
    "sparkles",
    false,
    [
      {
        id: "limpieza-profunda",
        name: "Limpieza profunda",
        specialties: [{ id: "limpieza-profunda", label: "Limpieza profunda" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "Profesionales",
    "profesionales",
    "Asesoría legal, contable y servicios especializados.",
    "Expertos para consultas profesionales y trámites.",
    "briefcase",
    false,
    [
      {
        id: "asesoria",
        name: "Asesoría especializada",
        specialties: [{ id: "asesoria-legal", label: "Asesoría legal" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "Salud",
    "salud",
    "Atención domiciliaria y cuidados especializados.",
    "Profesionales de salud para apoyo en el hogar.",
    "heart",
    false,
    [
      {
        id: "atencion-domiciliaria",
        name: "Atención domiciliaria",
        specialties: [{ id: "atencion-domiciliaria", label: "Atención domiciliaria" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "Tecnología",
    "tecnologia",
    "Soporte PC, redes e internet.",
    "Técnicos para equipos, conectividad y soluciones digitales.",
    "laptop",
    true,
    [
      {
        id: "soporte",
        name: "Soporte técnico",
        specialties: [{ id: "soporte-pc", label: "Soporte técnico PC" }],
      },
      {
        id: "redes",
        name: "Redes e internet",
        specialties: [{ id: "redes", label: "Redes e internet" }],
      },
    ],
  ),
  legacyRootFromCatalog(
    "Transporte de carga",
    "transporte-de-carga",
    "Fletes, mudanzas y traslado de carga.",
    "Conductores y equipos para mover muebles, carga y mudanzas.",
    "truck",
    false,
    [
      {
        id: "fletes",
        name: "Fletes y mudanzas",
        specialties: [{ id: "fletes", label: "Fletes y mudanzas" }],
      },
    ],
  ),
];
