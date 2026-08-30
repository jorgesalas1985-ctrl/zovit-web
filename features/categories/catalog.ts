export type CanonicalCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CanonicalSpecialty = {
  id: string;
  name: string;
  slug: string;
};

export const CANONICAL_CATEGORIES = [
  { id: "automotriz", name: "Automotriz", slug: "automotriz" },
  { id: "auxiliar-de-aseo", name: "Auxiliar de Aseo", slug: "auxiliar-de-aseo" },
  { id: "construccion", name: "Construcción", slug: "construccion" },
  { id: "educacion", name: "Educación", slug: "educacion" },
  {
    id: "fuerzas-armadas-orden-seguridad",
    name: "Fuerzas Armadas, de Orden y Seguridad",
    slug: "fuerzas-armadas-orden-seguridad",
  },
  { id: "hogar", name: "Hogar", slug: "hogar" },
  { id: "jardineria", name: "Jardinería", slug: "jardineria" },
  { id: "limpieza", name: "Limpieza", slug: "limpieza" },
  { id: "profesionales", name: "Profesionales", slug: "profesionales" },
  { id: "salud", name: "Salud", slug: "salud" },
  { id: "tecnologia", name: "Tecnología", slug: "tecnologia" },
  { id: "transporte-de-carga", name: "Transporte de carga", slug: "transporte-de-carga" },
] as const satisfies readonly CanonicalCategory[];

export const CANONICAL_SPECIALTIES = [
  { id: "aire-acondicionado-auto", name: "Aire acondicionado automotriz", slug: "aire-acondicionado-auto" },
  { id: "albanileria", name: "Albañilería", slug: "albanileria" },
  { id: "apoyo-de-aseo-por-horas", name: "Apoyo de aseo por horas", slug: "apoyo-de-aseo-por-horas" },
  { id: "asesoria-legal", name: "Asesoría legal", slug: "asesoria-legal" },
  { id: "asesoria-previsional", name: "Asesoría previsional", slug: "asesoria-previsional" },
  { id: "aseo-de-condominios", name: "Aseo de condominios", slug: "aseo-de-condominios" },
  { id: "aseo-de-oficinas", name: "Aseo de oficinas", slug: "aseo-de-oficinas" },
  { id: "aseo-domiciliario", name: "Aseo domiciliario", slug: "aseo-domiciliario" },
  { id: "atencion-domiciliaria", name: "Atención domiciliaria", slug: "atencion-domiciliaria" },
  { id: "ayudantias", name: "Ayudantías", slug: "ayudantias" },
  { id: "cerrajeria", name: "Cerrajería", slug: "cerrajeria" },
  { id: "clases-online-apoyo-escolar", name: "Apoyo escolar general", slug: "clases-online-apoyo-escolar" },
  { id: "clases-online-ciencias", name: "Ciencias", slug: "clases-online-ciencias" },
  { id: "clases-online-ingles", name: "Inglés", slug: "clases-online-ingles" },
  { id: "clases-online-lenguaje", name: "Lenguaje y comunicación", slug: "clases-online-lenguaje" },
  { id: "clases-online-matematicas", name: "Matemáticas", slug: "clases-online-matematicas" },
  { id: "clases-online-paes", name: "Preparación PAES", slug: "clases-online-paes" },
  { id: "clases-particulares-docentes-profesionales", name: "Clases particulares de docentes profesionales", slug: "clases-particulares-docentes-profesionales" },
  { id: "climatizacion", name: "Climatización", slug: "climatizacion" },
  { id: "defensa-funcionaria", name: "Defensa funcionaria", slug: "defensa-funcionaria" },
  { id: "electricidad-automotriz", name: "Electricidad automotriz", slug: "electricidad-automotriz" },
  { id: "electricidad-domiciliaria", name: "Electricidad domiciliaria", slug: "electricidad-domiciliaria" },
  { id: "electricidad-obra", name: "Instalaciones eléctricas en obra", slug: "electricidad-obra" },
  { id: "escritos-a-carabineros", name: "Escritos a Carabineros", slug: "escritos-a-carabineros" },
  { id: "escritos-a-gendarmeria", name: "Escritos a Gendarmería", slug: "escritos-a-gendarmeria" },
  { id: "escritos-a-la-armada", name: "Escritos a la Armada", slug: "escritos-a-la-armada" },
  { id: "escritos-a-la-fuerza-aerea", name: "Escritos a la Fuerza Aérea", slug: "escritos-a-la-fuerza-aerea" },
  { id: "escritos-a-la-pdi", name: "Escritos a la PDI", slug: "escritos-a-la-pdi" },
  { id: "escritos-al-ejercito", name: "Escritos al Ejército", slug: "escritos-al-ejercito" },
  { id: "fletes", name: "Fletes y mudanzas", slug: "fletes" },
  { id: "gasfiteria", name: "Gasfitería", slug: "gasfiteria" },
  { id: "limpieza-de-vidrios", name: "Limpieza de vidrios", slug: "limpieza-de-vidrios" },
  { id: "limpieza-despues-de-obras", name: "Limpieza después de obras", slug: "limpieza-despues-de-obras" },
  { id: "limpieza-profunda", name: "Limpieza profunda", slug: "limpieza-profunda" },
  { id: "mantencion-jardines", name: "Mantención de jardines", slug: "mantencion-jardines" },
  { id: "mecanica-general", name: "Mecánica general", slug: "mecanica-general" },
  { id: "orientacion-para-personal-activo", name: "Orientación para personal activo", slug: "orientacion-para-personal-activo" },
  { id: "orientacion-para-personal-en-retiro", name: "Orientación para personal en retiro", slug: "orientacion-para-personal-en-retiro" },
  { id: "otros-servicios-relacionados", name: "Otros servicios relacionados", slug: "otros-servicios-relacionados" },
  { id: "pensiones-y-retiros", name: "Pensiones y retiros", slug: "pensiones-y-retiros" },
  { id: "pintura", name: "Pintura", slug: "pintura" },
  { id: "recursos-administrativos", name: "Recursos administrativos", slug: "recursos-administrativos" },
  { id: "redes", name: "Redes e internet", slug: "redes" },
  { id: "sanitizacion", name: "Sanitización", slug: "sanitizacion" },
  { id: "scanner-automotriz", name: "Scanner automotriz", slug: "scanner-automotriz" },
  { id: "scanner-maquinaria-pesada", name: "Scanner maquinaria pesada", slug: "scanner-maquinaria-pesada" },
  { id: "scanner-motocicletas", name: "Scanner motocicletas", slug: "scanner-motocicletas" },
  { id: "soporte-pc", name: "Soporte técnico PC", slug: "soporte-pc" },
  { id: "tutorias-ciencias-naturales", name: "Ciencias naturales", slug: "tutorias-ciencias-naturales" },
  { id: "tutorias-historia", name: "Historia y ciencias sociales", slug: "tutorias-historia" },
  { id: "tutorias-ingles", name: "Inglés", slug: "tutorias-ingles" },
  { id: "tutorias-lenguaje", name: "Lenguaje y comunicación", slug: "tutorias-lenguaje" },
  { id: "tutorias-lectoescritura", name: "Lectoescritura", slug: "tutorias-lectoescritura" },
  { id: "tutorias-matematicas", name: "Matemáticas", slug: "tutorias-matematicas" },
  { id: "tutorias-paes", name: "Preparación PAES", slug: "tutorias-paes" },
  { id: "tutorias-tareas", name: "Apoyo con tareas escolares", slug: "tutorias-tareas" },
] as const satisfies readonly CanonicalSpecialty[];

export function getCanonicalCategoryById(id: string): CanonicalCategory | undefined {
  return CANONICAL_CATEGORIES.find((category) => category.id === id);
}

export function getCanonicalCategoryByName(name: string): CanonicalCategory | undefined {
  return CANONICAL_CATEGORIES.find((category) => category.name === name);
}

export function getCanonicalSpecialty(id: string): CanonicalSpecialty | undefined {
  return CANONICAL_SPECIALTIES.find((specialty) => specialty.id === id);
}
