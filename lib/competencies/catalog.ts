import type { MasterCompetency } from "@/lib/competencies/types";

export const MASTER_COMPETENCIES: MasterCompetency[] = [
  {
    id: "electricity-basic-installation",
    name: "Instalacion electrica basica",
    domain: "electricity",
    description: "Comprende trabajos electricos simples de baja complejidad bajo reglas de seguridad.",
    defaultLevel: "academic_competency",
    scopes: ["supervised_work", "low_risk", "requires_external_license"],
    status: "active",
    version: "0.1",
    relatedServiceKeywords: ["electricidad", "enchufe", "luminaria", "interruptor"],
  },
  {
    id: "plumbing-basic-repair",
    name: "Reparacion sanitaria basica",
    domain: "plumbing",
    description: "Identifica y corrige fallas sanitarias simples sin intervenciones reguladas complejas.",
    defaultLevel: "academic_competency",
    scopes: ["supervised_work", "low_risk"],
    status: "active",
    version: "0.1",
    relatedServiceKeywords: ["gasfiteria", "llave", "filtracion", "lavamanos"],
  },
  {
    id: "construction-finishing-support",
    name: "Apoyo en terminaciones de construccion",
    domain: "construction",
    description: "Ejecuta apoyo en pintura, sellos, terminaciones menores y preparacion de superficies.",
    defaultLevel: "academic_competency",
    scopes: ["supervised_work", "low_risk"],
    status: "active",
    version: "0.1",
    relatedServiceKeywords: ["pintura", "terminaciones", "sellado", "reparacion menor"],
  },
  {
    id: "climatization-basic-maintenance",
    name: "Mantencion basica de climatizacion",
    domain: "climatization",
    description: "Apoya limpieza, revision basica y mantencion preventiva de equipos de climatizacion.",
    defaultLevel: "academic_competency",
    scopes: ["supervised_work", "diagnosis_only", "requires_external_license"],
    status: "active",
    version: "0.1",
    relatedServiceKeywords: ["climatizacion", "aire acondicionado", "mantencion", "filtro"],
  },
  {
    id: "digital-basic-support",
    name: "Soporte digital basico",
    domain: "digital",
    description: "Apoya configuraciones digitales simples, orientacion de uso y resolucion basica.",
    defaultLevel: "academic_competency",
    scopes: ["autonomous_work", "low_risk"],
    status: "active",
    version: "0.1",
    relatedServiceKeywords: ["computador", "internet", "correo", "configuracion"],
  },
  {
    id: "community-low-risk-tasks",
    name: "Tareas comunitarias de baja complejidad",
    domain: "general_support",
    description: "Realiza tareas de apoyo cotidiano que no requieren certificacion tecnica.",
    defaultLevel: "evaluated_competency",
    scopes: ["autonomous_work", "low_risk"],
    status: "active",
    version: "0.1",
    relatedServiceKeywords: ["compras", "entrega", "apoyo", "jardineria basica"],
  },
];

export function getMasterCompetency(id: string): MasterCompetency | null {
  return MASTER_COMPETENCIES.find((competency) => competency.id === id) ?? null;
}
