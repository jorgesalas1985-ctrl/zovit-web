import type { ParticipationChoice, ServiceProfileType } from "@/lib/worker/types";

export const SERVICE_PROFILE_COPY: Record<
  ServiceProfileType,
  { title: string; description: string; examples: string[] }
> = {
  certified: {
    title: "Profesional Certificado",
    description:
      "Cuenta con un título profesional o técnico, licencia habilitante o certificación formal relacionada con los servicios que ofrece.",
    examples: [
      "Electricista autorizado",
      "Instalador de gas certificado",
      "Técnico en climatización",
      "Constructor civil",
      "Técnico mecánico",
      "Profesional universitario",
    ],
  },
  experience_verified: {
    title: "Profesional Verificado por Experiencia",
    description:
      "Cuenta con experiencia comprobable en su oficio, aunque no posea un título o certificación formal.",
    examples: [
      "Pintor",
      "Albañil",
      "Carpintero",
      "Maestro de terminaciones",
      "Jardinero",
      "Soldador",
      "Gasfiter con experiencia no certificada (solo trabajos sin acreditación obligatoria)",
    ],
  },
  in_training: {
    title: "Profesional en Formación",
    description:
      "Actualmente estudia o se capacita en un área técnica o profesional y puede realizar trabajos acordes con su nivel de formación.",
    examples: [
      "Estudiante de electricidad",
      "Estudiante de mecánica",
      "Estudiante de construcción",
      "Aprendiz de carpintería",
      "Estudiante de informática",
    ],
  },
  community_collaborator: {
    title: "Colaborador Comunitario",
    description:
      "Persona que desea generar ingresos realizando servicios de apoyo o baja complejidad que no requieren título profesional ni experiencia técnica especializada.",
    examples: [
      "Compras o retiros de pedidos",
      "Entrega de documentos o encomiendas",
      "Paseo de mascotas",
      "Jardinería básica",
      "Armado básico de muebles",
      "Limpieza básica",
      "Acompañamiento no médico",
      "Apoyo en mudanzas pequeñas",
    ],
  },
};

export const PARTICIPATION_OPTIONS: Array<{
  id: ParticipationChoice;
  label: string;
  mapsTo: ServiceProfileType | null;
}> = [
  {
    id: "certified",
    label: "Tengo título, licencia o certificación",
    mapsTo: "certified",
  },
  {
    id: "experience",
    label: "Tengo experiencia en un oficio",
    mapsTo: "experience_verified",
  },
  {
    id: "training",
    label: "Actualmente estoy estudiando o capacitándome",
    mapsTo: "in_training",
  },
  {
    id: "community",
    label: "Quiero realizar tareas de apoyo o servicios de baja complejidad",
    mapsTo: "community_collaborator",
  },
  {
    id: "unsure",
    label: "No estoy seguro; ayúdame a elegir",
    mapsTo: null,
  },
];

export const WORKER_STATUS_LABELS: Record<
  import("@/lib/worker/types").WorkerRegistrationStatus,
  string
> = {
  draft: "Borrador",
  incomplete: "Registro incompleto",
  submitted: "Enviado a revisión",
  needs_info: "Información adicional solicitada",
  verified: "Verificado",
  partially_verified: "Verificado parcialmente",
  rejected: "Rechazado",
  suspended: "Suspendido",
  document_expired: "Documento vencido",
};

export const CREDENTIAL_STATUS_LABELS: Record<
  import("@/lib/worker/types").CredentialDocStatus,
  string
> = {
  pending: "Pendiente de revisión",
  verified: "Documento verificado",
  rejected: "Documento rechazado",
  expired: "Documento vencido",
};

export const COMMUNITY_TASK_OPTIONS = [
  "Llevar combustible (cumpliendo normativa y seguridad)",
  "Realizar compras o retirar pedidos",
  "Entregar documentos",
  "Pasear mascotas",
  "Regar jardines",
  "Cortar pasto",
  "Podar arbustos / jardinería básica",
  "Ayudar a cargar objetos livianos",
  "Armado básico de muebles",
  "Limpieza básica",
  "Retiro o entrega de encomiendas",
  "Acompañamiento no médico",
  "Apoyo en mudanzas pequeñas",
  "Tareas domésticas sencillas",
] as const;

export const WEEK_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const WORKER_COPY = {
  title: "Cuéntanos cómo puedes ayudar",
  subtitle:
    "Queremos conocer tu formación, experiencia y los servicios que deseas ofrecer para construir un perfil confiable dentro de ZOVIT.",
  documents:
    "Tus documentos serán utilizados únicamente para verificar tus antecedentes. No serán visibles para los clientes.",
  classification:
    "Tu perfil será asignado según la información entregada y validada. Podrás ofrecer únicamente los servicios compatibles con tus antecedentes y nivel de experiencia.",
  community:
    "No necesitas un título para aportar. En ZOVIT también puedes ofrecer servicios de apoyo, tareas cotidianas y trabajos de baja complejidad.",
  submitted:
    "Recibimos tus antecedentes. Nuestro equipo está revisando la información para asignarte el perfil de servicio adecuado.",
  consent:
    "Autorizo a ZOVIT a tratar mis datos personales y documentos únicamente para verificar antecedentes y autorizar servicios. Acepto coordinar trabajos y cobros solo dentro de ZOVIT, declarar el precio real (sin bajar el monto ni cerrar tratos fuera tras el pago) y entiendo que incumplir puede bloquear mi cuenta. ZOVIT podrá solicitar información adicional cuando sea necesario.",
} as const;

export const PUBLIC_BADGE_LABELS: Record<
  import("@/lib/worker/types").PublicWorkerBadge,
  string
> = {
  identity_verified: "Identidad verificada",
  background_reviewed: "Antecedentes revisados",
  title_verified: "Título verificado",
  certification_verified: "Certificación verificada",
  license_valid: "Licencia vigente",
  experience_proven: "Experiencia comprobada",
  student_active: "Estudiante vigente",
  in_training: "Profesional en Formación",
  community_collaborator: "Colaborador Comunitario",
  zovit_featured: "Profesional destacado ZOVIT",
  jobs_completed: "Trabajos completados",
  avg_rating: "Calificación promedio",
  fulfillment_rate: "Tasa de cumplimiento",
};
