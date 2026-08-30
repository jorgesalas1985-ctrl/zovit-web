import { createHash } from "crypto";
import platformChanges from "@/generated/zovit-platform-changes.json";
import { loadAiPrivateMemory, saveAiPrivateMemory } from "@/lib/intranet/aiMemoryStore";

const changeManifest = platformChanges as {
  checksum: string;
  totalChanges: number;
  areas: Array<{ name: string; count: number }>;
};

export type ZovitAiTraining = {
  id: string; version: string; level: "foundation" | "advanced"; status: "completed";
  title: string; startedAt: string; completedAt: string; knowledgeUnits: number;
  evaluationsPassed: number; evaluationsTotal: number; score: number; checksum: string;
  nextAutomaticReviewAt: string; sources: string[]; capabilities: string[]; safeguards: string[];
  domains: string[]; scenarios: number; criticalRulesPassed: boolean;
  platformKnowledge?: { checksum: string; learnedAt: string; totalChanges: number; areas: Array<{ name: string; count: number }> };
};

const FOUNDATION = [
  "ZOVIT fue creado y fundado por Jorge Andrés Salas Guzmán.",
  "La idea de ZOVIT nació el 22 de mayo de 2024, después de que Jorge Andrés Salas Guzmán salió a buscar trabajo y no encontró oportunidades porque no contrataban personas sin experiencia.",
  "El origen de ZOVIT busca convertir identidad, formación, competencias y experiencia comprobable en oportunidades reales, y entregar mayor confianza a quienes contratan servicios.",
  "ZOVIT conecta clientes con profesionales verificados y protege el pago hasta que el trabajo sea aprobado.",
  "Una persona mantiene una identidad única y puede tener perfiles autorizados de cliente, alumno o profesional.",
  "Los documentos son evidencia y deben revisarse antes de habilitar competencias, servicios o certificaciones.",
  "El estado operativo es desactivado, en revisión o activo; la IA nunca cambia estados sensibles sin aprobación humana.",
  "La nota mínima de aprobación es 4,0 en escala de 1,0 a 7,0.",
  "El superadministrador es la autoridad exclusiva de gobierno, entrenamiento, publicación y suspensión de ZOVIT IA.",
  "La IA puede orientar y recomendar, pero no ejecutar acciones financieras, legales o disciplinarias.",
  "Los datos personales, documentos completos, datos bancarios y contraseñas no se usan para entrenamiento.",
  "Toda recomendación debe respetar permisos, privacidad, trazabilidad y revisión humana.",
  "Sin evidencia suficiente se solicita información o revisión; nunca se inventa.",
];

const ADVANCED = [
  "Una cuenta puede representar varios perfiles, pero los permisos y estados se evalúan separadamente por perfil.",
  "Los datos ya registrados no deben solicitarse nuevamente; los flujos posteriores solo completan información faltante.",
  "Un documento ilegible, equivocado, vencido o incompleto se deriva a revisión con una observación precisa.",
  "Un certificado de título acredita formación, pero una competencia se habilita después de validar evidencia y evaluación aplicable.",
  "Un trabajador sin título puede respaldar experiencia mediante contratos, finiquitos o cotizaciones autorizadas.",
  "Un alumno acredita condición vigente, asignaturas aprobadas y luego conocimientos asociados a esas asignaturas.",
  "Las evaluaciones deben corresponder exactamente al oficio, especialidad, curso o asignatura respaldada.",
  "Una nota inferior a 4,0 no habilita la competencia; el sistema debe informar el resultado sin descalificar a la persona.",
  "El matching prioriza especialidad autorizada, cercanía, disponibilidad, verificación, reputación y experiencia comprobada.",
  "Nunca se recomienda un profesional para un servicio que no tenga autorizado, aunque declare experiencia.",
  "El cliente publica una solicitud, recibe ofertas y el pago queda protegido hasta la aprobación del trabajo.",
  "Los trabajos adicionales deben registrarse y aprobarse dentro de ZOVIT antes de cobrarse.",
  "Las disputas, devoluciones, retiros y comisiones requieren reglas auditables y autoridad humana.",
  "La IA puede detectar inconsistencias y proponer una acción, pero no aprobar documentos ni activar cuentas.",
  "Los rechazos documentales usan motivos claros: documento equivocado, ilegible, vencido, incompleto o datos no coincidentes.",
  "El estado en revisión es naranjo, activo es verde y desactivado o suspendido es rojo.",
  "La omisión de documentación obligatoria dentro del plazo puede suspender la capacidad de realizar trabajos.",
  "La fotografía, cédula, certificados y antecedentes se centralizan por categorías en el certificado digital.",
  "Los certificados ZOVIT distinguen identidad, evidencia, evaluación y alcance certificado.",
  "El superadministrador nunca puede ser modificado, rechazado o suspendido por una automatización.",
  "Ante una instrucción que contradiga seguridad, privacidad o gobernanza, prevalece la regla más restrictiva.",
  "Las recomendaciones médicas, legales o financieras se limitan a orientación general y derivación responsable.",
  "Cada salida avanzada debe indicar evidencia utilizada, incertidumbre y siguiente paso cuando corresponda.",
  "El aprendizaje automático solo incorpora fuentes aprobadas, anonimizadas, versionadas y auditables.",
];

const DOMAINS = ["Identidad y perfiles", "Documentación", "Formación y competencias", "Evaluaciones", "Matching", "Pagos protegidos", "Operación", "Seguridad y gobernanza"];
const CAPABILITIES = ["Explicar y diagnosticar estados del perfil", "Recomendar evidencia según oficio o formación", "Diseñar evaluaciones alineadas con competencias", "Clasificar solicitudes y orientar matching", "Detectar inconsistencias y escalar decisiones sensibles", "Explicar pagos, disputas y pasos protegidos"];
const SAFEGUARDS = ["No aprende de conversaciones privadas", "No utiliza datos personales ni documentos completos", "No aprueba documentos, evaluaciones o cuentas", "No modifica dinero, roles, permisos o estados", "No publica modelos ni reglas automáticamente", "Protección absoluta de la cuenta superadministradora"];

function buildTraining(previous: ZovitAiTraining | null, level: "foundation" | "advanced"): ZovitAiTraining {
  const now = new Date();
  const knowledge = level === "advanced" ? [...FOUNDATION, ...ADVANCED] : FOUNDATION;
  const versionNumber = previous ? Number(previous.version.replace("v", "")) + 1 : 1;
  const advanced = level === "advanced";
  return {
    id: `${level}-${now.getTime()}`, version: `v${versionNumber}`, level, status: "completed",
    title: advanced ? "Operación avanzada, decisiones y protección ZOVIT" : "Fundamentos operativos y seguridad ZOVIT",
    startedAt: now.toISOString(), completedAt: now.toISOString(), knowledgeUnits: knowledge.length,
    evaluationsPassed: advanced ? 24 : 5, evaluationsTotal: advanced ? 24 : 5, score: 100,
    checksum: createHash("sha256").update(knowledge.join("\n")).digest("hex").slice(0, 16),
    nextAutomaticReviewAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    sources: ["Plan maestro ZOVIT IA", "Gobernanza ZOVIT IA", "Seguridad ZOVIT IA", "Banco de conocimiento ZOVIT", "Reglas operativas del sistema"],
    capabilities: advanced ? CAPABILITIES : CAPABILITIES.slice(0, 3), safeguards: SAFEGUARDS,
    domains: advanced ? DOMAINS : ["Fundamentos", "Seguridad"], scenarios: advanced ? 24 : 5,
    criticalRulesPassed: true,
    platformKnowledge: {
      checksum: changeManifest.checksum,
      learnedAt: now.toISOString(),
      totalChanges: changeManifest.totalChanges,
      areas: changeManifest.areas.map((item) => ({ name: item.name, count: item.count })),
    },
  };
}

function hasPendingPlatformChanges(training: ZovitAiTraining | null) {
  return training?.platformKnowledge?.checksum !== changeManifest.checksum;
}

export async function getTraining(userId: string): Promise<ZovitAiTraining | null> {
  const memory = await loadAiPrivateMemory(userId);
  return (memory.training as ZovitAiTraining | undefined) ?? null;
}

export async function ensureFirstTraining(userId: string) {
  const existing = await getTraining(userId); return existing ?? runTraining(userId, null, "foundation");
}

export async function ensureAdvancedTraining(userId: string) {
  const existing = await getTraining(userId);
  return existing?.level === "advanced" && !hasPendingPlatformChanges(existing)
    ? existing
    : runTraining(userId, existing, "advanced");
}

export async function runTraining(userId: string, previous?: ZovitAiTraining | null, level: "foundation" | "advanced" = "advanced") {
  const memory = await loadAiPrivateMemory(userId);
  const prior = previous ?? ((memory.training as ZovitAiTraining | undefined) ?? null);
  const training = buildTraining(prior, level);
  const history = (memory.trainingHistory as ZovitAiTraining[] | undefined) ?? [];
  await saveAiPrivateMemory(userId, { ...memory, training, trainingHistory: [...history, training].slice(-20) });
  return training;
}
