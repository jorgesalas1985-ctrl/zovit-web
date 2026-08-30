import type { ServiceCategory } from "@/lib/categories";
import {
  getCanonicalCategoryById,
  getCanonicalSpecialty,
} from "@/features/categories/catalog";

export type SpecialtyDefinition = {
  id: string;
  label: string;
  keywords: string[];
};

export type CategoryDefinition = {
  category: ServiceCategory;
  specialties: SpecialtyDefinition[];
  generalKeywords: string[];
};

type ServiceCatalogProfile = {
  categoryId: string;
  specialties: Array<Pick<SpecialtyDefinition, "id" | "keywords">>;
  generalKeywords: string[];
};

const SERVICE_CATALOG_SOURCE: ServiceCatalogProfile[] = [
  {
    categoryId: "automotriz",
    generalKeywords: [
      "auto", "automovil", "automóvil", "vehiculo", "vehículo", "carro", "camioneta",
      "motor", "mecanico", "mecánico", "taller", "patente", "bateria", "batería",
    ],
    specialties: [
      {
        id: "electricidad-automotriz",
        keywords: [
          "luz", "luces", "farol", "faroles", "alternador", "arranque", "encendido",
          "tablero", "fusible", "cortocircuito", "bateria", "batería", "no enciende",
          "se apago", "se apagó", "se apagaron", "parpadea", "electrico", "eléctrico",
          "cableado", "sensor", "computador", "ecu",
        ],
      },
      {
        id: "mecanica-general",
        keywords: [
          "ruido", "vibracion", "vibración", "freno", "frenos", "embrague", "correa",
          "aceite", "revisión técnica", "revision tecnica", "no parte", "no arranca",
          "sobrecalienta", "perdida aceite", "pérdida aceite",
        ],
      },
      {
        id: "scanner-motocicletas",
        keywords: [
          "scanner", "moto", "motocicleta", "motos", "check engine", "luz motor",
          "falla electronica", "falla electrónica", "codigo error", "código error", "obd",
        ],
      },
      {
        id: "scanner-automotriz",
        keywords: [
          "scanner", "auto", "automotriz", "automovil", "automóvil", "vehiculo", "vehículo",
          "check engine", "luz motor", "falla electronica", "falla electrónica",
          "codigo error", "código error", "obd", "inyeccion", "inyección",
        ],
      },
      {
        id: "scanner-maquinaria-pesada",
        keywords: [
          "scanner", "maquinaria pesada", "camion", "camión", "bus", "excavadora",
          "grua", "grúa", "check engine", "falla electronica", "falla electrónica", "obd",
        ],
      },
      {
        id: "aire-acondicionado-auto",
        keywords: ["aire acondicionado", "clima auto", "no enfría", "gas refrigerante"],
      },
    ],
  },
  {
    categoryId: "hogar",
    generalKeywords: [
      "casa", "hogar", "departamento", "depto", "baño", "bano", "cocina", "living",
      "ducha", "grifo", "enchufe", "interruptor",
    ],
    specialties: [
      {
        id: "electricidad-domiciliaria",
        keywords: [
          "luz", "luces", "enchufe", "interruptor", "tablero", "cortocircuito",
          "se fue la luz", "no hay luz", "amperaje", "tomacorriente",
        ],
      },
      {
        id: "gasfiteria",
        keywords: [
          "agua", "filtracion", "filtración", "goteo", "gotea", "cañeria", "cañería",
          "gasfiter", "gasfíter", "desague", "desagüe", "inodoro", "llave paso",
          "calefont", "termo", "caldera",
        ],
      },
      {
        id: "climatizacion",
        keywords: [
          "calefaccion", "calefacción", "aire acondicionado", "split", "no calienta",
          "no enfría", "clima",
        ],
      },
      {
        id: "cerrajeria",
        keywords: [
          "cerradura", "llave", "puerta trabada", "no abre", "cerrojo", "chapa",
        ],
      },
    ],
  },
  {
    categoryId: "construccion",
    generalKeywords: [
      "obra", "construccion", "construcción", "muro", "pintura", "pintor", "terminaciones",
      "remodelacion", "remodelación", "techumbre", "techo",
    ],
    specialties: [
      {
        id: "pintura",
        keywords: ["pintar", "pintura", "brocha", "rodillo", "humeda", "húmeda", "filtracion pared"],
      },
      {
        id: "albanileria",
        keywords: ["muro", "ladrillo", "cemento", "radier", "loseta", "tabique"],
      },
      {
        id: "electricidad-obra",
        keywords: ["canalizacion", "canalización", "tablero obra", "instalacion electrica"],
      },
    ],
  },
  {
    categoryId: "tecnologia",
    generalKeywords: [
      "computador", "notebook", "laptop", "internet", "wifi", "red", "telefono", "teléfono",
      "impresora", "software", "programa",
    ],
    specialties: [
      {
        id: "soporte-pc",
        keywords: ["lento", "virus", "pantalla azul", "no enciende pc", "formatear"],
      },
      {
        id: "redes",
        keywords: ["wifi", "router", "modem", "sin internet", "cableado red", "switch"],
      },
    ],
  },
  {
    categoryId: "jardineria",
    generalKeywords: ["jardin", "jardín", "pasto", "césped", "cesped", "arbol", "árbol", "planta"],
    specialties: [
      {
        id: "mantencion-jardines",
        keywords: ["podar", "cortar pasto", "riego", "poda", "mantencion jardin"],
      },
    ],
  },
  {
    categoryId: "limpieza",
    generalKeywords: ["limpieza", "aseo", "limpiar", "profunda", "oficina", "departamento"],
    specialties: [
      {
        id: "limpieza-profunda",
        keywords: ["mudanza", "post obra", "desinfeccion", "desinfección", "alfombra"],
      },
    ],
  },
  {
    categoryId: "transporte-de-carga",
    generalKeywords: ["flete", "mudanza", "camion", "camión", "carga", "transporte"],
    specialties: [
      {
        id: "fletes",
        keywords: ["mudanza", "flete", "retiro", "traslado muebles"],
      },
    ],
  },
  {
    categoryId: "salud",
    generalKeywords: ["salud", "enfermeria", "enfermería", "kinesiologia", "kinesiología"],
    specialties: [
      {
        id: "atencion-domiciliaria",
        keywords: ["enfermera", "curaciones", "adulto mayor", "post operatorio"],
      },
    ],
  },
  {
    categoryId: "educacion",
    generalKeywords: [
      "clases",
      "profesor",
      "profesora",
      "apoyo escolar",
      "matematicas",
      "matemáticas",
      "tutor",
      "tutoria",
      "tutoría",
      "ayudantia",
      "ayudantía",
      "clases online",
      "clases particulares",
      "docente",
    ],
    specialties: [
      {
        id: "tutorias-matematicas",
        keywords: ["algebra", "calculo", "cálculo", "geometria", "geometría", "numeros", "números"],
      },
      {
        id: "tutorias-lenguaje",
        keywords: ["comprension lectora", "comprensión lectora", "redaccion", "redacción", "ortografia", "ortografía"],
      },
      {
        id: "tutorias-ciencias-naturales",
        keywords: ["biologia", "biología", "fisica", "física", "quimica", "química", "ciencias"],
      },
      {
        id: "tutorias-historia",
        keywords: ["historia", "geografia", "geografía", "ciencias sociales", "formacion ciudadana"],
      },
      {
        id: "tutorias-ingles",
        keywords: ["english", "toefl", "ielts", "speaking", "gramatica inglesa", "gramática inglesa"],
      },
      {
        id: "tutorias-paes",
        keywords: ["paes", "psu", "prueba de acceso", "preuniversitario", "preuniversitaria"],
      },
      {
        id: "tutorias-lectoescritura",
        keywords: ["leer", "escribir", "alfabetizacion", "alfabetización", "primero basico", "primero básico"],
      },
      {
        id: "tutorias-tareas",
        keywords: ["tareas", "deberes", "guia", "guía", "refuerzo escolar", "apoyo escolar"],
      },
      {
        id: "ayudantias",
        keywords: ["ayudante", "universidad", "ramo", "catedra", "cátedra", "guia universitaria", "guía universitaria"],
      },
      {
        id: "clases-online-matematicas",
        keywords: ["clases online matematicas", "clases online matemáticas", "zoom matematicas", "zoom matemáticas"],
      },
      {
        id: "clases-online-lenguaje",
        keywords: ["clases online lenguaje", "clases online comprension lectora"],
      },
      {
        id: "clases-online-ciencias",
        keywords: ["clases online ciencias", "clases online biologia", "clases online biología"],
      },
      {
        id: "clases-online-ingles",
        keywords: ["clases online ingles", "clases online inglés", "english online"],
      },
      {
        id: "clases-online-paes",
        keywords: ["paes online", "preuniversitario online", "clases online paes"],
      },
      {
        id: "clases-online-apoyo-escolar",
        keywords: ["apoyo escolar online", "clases online escolares", "refuerzo online"],
      },
      {
        id: "clases-particulares-docentes-profesionales",
        keywords: [
          "docente titulado",
          "profesor particular",
          "profesora particular",
          "clases particulares",
          "profesional de la educacion",
          "profesional de la educación",
        ],
      },
    ],
  },
  {
    categoryId: "profesionales",
    generalKeywords: ["abogado", "contador", "asesoria", "asesoría", "legal", "tributario"],
    specialties: [
      {
        id: "asesoria-legal",
        keywords: ["contrato", "demanda", "laboral", "divorcio", "herencia"],
      },
    ],
  },
];

function canonicalizeServiceCatalog(definitions: ServiceCatalogProfile[]): CategoryDefinition[] {
  return definitions.map((definition) => {
    const category = getCanonicalCategoryById(definition.categoryId);
    if (!category) {
      throw new Error(`Identidad canónica inválida para la categoría ${definition.categoryId}.`);
    }

    return {
      category: category.name as ServiceCategory,
      generalKeywords: definition.generalKeywords,
      specialties: definition.specialties.map((specialty) => {
        const canonicalSpecialty = getCanonicalSpecialty(specialty.id);
        if (!canonicalSpecialty) {
          throw new Error(`Identidad canónica inválida para la especialidad ${specialty.id}.`);
        }

        return {
          id: canonicalSpecialty.id,
          label: canonicalSpecialty.name,
          keywords: specialty.keywords,
        };
      }),
    };
  });
}

export const SERVICE_CATALOG: CategoryDefinition[] = canonicalizeServiceCatalog(SERVICE_CATALOG_SOURCE);

export function getSpecialtyLabel(category: ServiceCategory, specialtyId: string): string {
  const match = SERVICE_CATALOG.find((item) => item.category === category);
  return match?.specialties.find((specialty) => specialty.id === specialtyId)?.label ?? specialtyId;
}
