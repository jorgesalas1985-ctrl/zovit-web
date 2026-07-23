import type { ServiceCategory } from "@/lib/categories";

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

export const SERVICE_CATALOG: CategoryDefinition[] = [
  {
    category: "Automotriz",
    generalKeywords: [
      "auto", "automovil", "automóvil", "vehiculo", "vehículo", "carro", "camioneta",
      "motor", "mecanico", "mecánico", "taller", "patente", "bateria", "batería",
    ],
    specialties: [
      {
        id: "electricidad-automotriz",
        label: "Electricidad automotriz",
        keywords: [
          "luz", "luces", "farol", "faroles", "alternador", "arranque", "encendido",
          "tablero", "fusible", "cortocircuito", "bateria", "batería", "no enciende",
          "se apago", "se apagó", "se apagaron", "parpadea", "electrico", "eléctrico",
          "cableado", "sensor", "computador", "ecu",
        ],
      },
      {
        id: "mecanica-general",
        label: "Mecánica general",
        keywords: [
          "ruido", "vibracion", "vibración", "freno", "frenos", "embrague", "correa",
          "aceite", "revisión técnica", "revision tecnica", "no parte", "no arranca",
          "sobrecalienta", "perdida aceite", "pérdida aceite",
        ],
      },
      {
        id: "scanner-motocicletas",
        label: "Motocicletas",
        keywords: [
          "scanner", "moto", "motocicleta", "motos", "check engine", "luz motor",
          "falla electronica", "falla electrónica", "codigo error", "código error", "obd",
        ],
      },
      {
        id: "scanner-automotriz",
        label: "Automotriz",
        keywords: [
          "scanner", "auto", "automotriz", "automovil", "automóvil", "vehiculo", "vehículo",
          "check engine", "luz motor", "falla electronica", "falla electrónica",
          "codigo error", "código error", "obd", "inyeccion", "inyección",
        ],
      },
      {
        id: "scanner-maquinaria-pesada",
        label: "Maquinaria pesada",
        keywords: [
          "scanner", "maquinaria pesada", "camion", "camión", "bus", "excavadora",
          "grua", "grúa", "check engine", "falla electronica", "falla electrónica", "obd",
        ],
      },
      {
        id: "aire-acondicionado-auto",
        label: "Aire acondicionado automotriz",
        keywords: ["aire acondicionado", "clima auto", "no enfría", "gas refrigerante"],
      },
    ],
  },
  {
    category: "Hogar",
    generalKeywords: [
      "casa", "hogar", "departamento", "depto", "baño", "bano", "cocina", "living",
      "ducha", "grifo", "enchufe", "interruptor",
    ],
    specialties: [
      {
        id: "electricidad-domiciliaria",
        label: "Electricidad domiciliaria",
        keywords: [
          "luz", "luces", "enchufe", "interruptor", "tablero", "cortocircuito",
          "se fue la luz", "no hay luz", "amperaje", "tomacorriente",
        ],
      },
      {
        id: "gasfiteria",
        label: "Gasfitería",
        keywords: [
          "agua", "filtracion", "filtración", "goteo", "gotea", "cañeria", "cañería",
          "gasfiter", "gasfíter", "desague", "desagüe", "inodoro", "llave paso",
          "calefont", "termo", "caldera",
        ],
      },
      {
        id: "climatizacion",
        label: "Climatización",
        keywords: [
          "calefaccion", "calefacción", "aire acondicionado", "split", "no calienta",
          "no enfría", "clima",
        ],
      },
      {
        id: "cerrajeria",
        label: "Cerrajería",
        keywords: [
          "cerradura", "llave", "puerta trabada", "no abre", "cerrojo", "chapa",
        ],
      },
    ],
  },
  {
    category: "Construcción",
    generalKeywords: [
      "obra", "construccion", "construcción", "muro", "pintura", "pintor", "terminaciones",
      "remodelacion", "remodelación", "techumbre", "techo",
    ],
    specialties: [
      {
        id: "pintura",
        label: "Pintura",
        keywords: ["pintar", "pintura", "brocha", "rodillo", "humeda", "húmeda", "filtracion pared"],
      },
      {
        id: "albanileria",
        label: "Albañilería",
        keywords: ["muro", "ladrillo", "cemento", "radier", "loseta", "tabique"],
      },
      {
        id: "electricidad-obra",
        label: "Instalaciones eléctricas en obra",
        keywords: ["canalizacion", "canalización", "tablero obra", "instalacion electrica"],
      },
    ],
  },
  {
    category: "Tecnología",
    generalKeywords: [
      "computador", "notebook", "laptop", "internet", "wifi", "red", "telefono", "teléfono",
      "impresora", "software", "programa",
    ],
    specialties: [
      {
        id: "soporte-pc",
        label: "Soporte técnico PC",
        keywords: ["lento", "virus", "pantalla azul", "no enciende pc", "formatear"],
      },
      {
        id: "redes",
        label: "Redes e internet",
        keywords: ["wifi", "router", "modem", "sin internet", "cableado red", "switch"],
      },
    ],
  },
  {
    category: "Jardinería",
    generalKeywords: ["jardin", "jardín", "pasto", "césped", "cesped", "arbol", "árbol", "planta"],
    specialties: [
      {
        id: "mantencion-jardines",
        label: "Mantención de jardines",
        keywords: ["podar", "cortar pasto", "riego", "poda", "mantencion jardin"],
      },
    ],
  },
  {
    category: "Limpieza",
    generalKeywords: ["limpieza", "aseo", "limpiar", "profunda", "oficina", "departamento"],
    specialties: [
      {
        id: "limpieza-profunda",
        label: "Limpieza profunda",
        keywords: ["mudanza", "post obra", "desinfeccion", "desinfección", "alfombra"],
      },
    ],
  },
  {
    category: "Transporte de carga",
    generalKeywords: ["flete", "mudanza", "camion", "camión", "carga", "transporte"],
    specialties: [
      {
        id: "fletes",
        label: "Fletes y mudanzas",
        keywords: ["mudanza", "flete", "retiro", "traslado muebles"],
      },
    ],
  },
  {
    category: "Salud",
    generalKeywords: ["salud", "enfermeria", "enfermería", "kinesiologia", "kinesiología"],
    specialties: [
      {
        id: "atencion-domiciliaria",
        label: "Atención domiciliaria",
        keywords: ["enfermera", "curaciones", "adulto mayor", "post operatorio"],
      },
    ],
  },
  {
    category: "Educación",
    generalKeywords: ["clases", "profesor", "apoyo escolar", "matematicas", "matemáticas"],
    specialties: [
      {
        id: "apoyo-escolar",
        label: "Apoyo escolar",
        keywords: ["tareas", "psu", "paes", "refuerzo", "ingles", "inglés"],
      },
    ],
  },
  {
    category: "Profesionales",
    generalKeywords: ["abogado", "contador", "asesoria", "asesoría", "legal", "tributario"],
    specialties: [
      {
        id: "asesoria-legal",
        label: "Asesoría legal",
        keywords: ["contrato", "demanda", "laboral", "divorcio", "herencia"],
      },
    ],
  },
];

export function getSpecialtyLabel(category: ServiceCategory, specialtyId: string): string {
  const match = SERVICE_CATALOG.find((item) => item.category === category);
  return match?.specialties.find((specialty) => specialty.id === specialtyId)?.label ?? specialtyId;
}
