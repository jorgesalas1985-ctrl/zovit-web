import type { ZovitAiTraining } from "@/lib/intranet/zovitAiTraining";
import { extractRut, findStudentEnrollmentByRut, isPrivateDocumentSearch } from "@/lib/intranet/zovitPrivateRecords";
import { loadAiPrivateMemory, saveAiPrivateMemory } from "@/lib/intranet/aiMemoryStore";

export type AiMessageLink = { label: string; href: string };

export type AiConversationMessage = {
  id: string;
  role: "superadmin" | "assistant";
  text: string;
  createdAt: string;
  kind: "message" | "training_order" | "system";
  links?: AiMessageLink[];
};

export type AiTrainingOrder = {
  id: string;
  instruction: string;
  createdAt: string;
  status: "learned" | "requires_review";
  sensitive: boolean;
};

export type ZovitHistoryEvent = { id: string; date: string; details: string; createdAt: string; createdBy: string };

function historyDetails(message: string) {
  const match = message.match(/(?:guarda|guardar|registra|registrar|recuerda|recordar)(?: esto)? (?:en|para) la historia(?: de zovit)?[:\s-]+(.+)/i);
  return match?.[1]?.trim() || null;
}

const SENSITIVE = /\b(pago|dinero|eliminar|borrar|suspender|activar|aprobar|rechazar|rol|permiso|contraseña|secreto|publicar|producci[oó]n|legal|disciplin)/i;

function normalizeQuestion(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function answer(message: string, training: ZovitAiTraining | null, orders: AiTrainingOrder[]) {
  const lower = normalizeQuestion(message);
  if (/^(hola|hol[a]+ zovit|buenas|buen dia|buenos dias|buenas tardes|buenas noches|saludos|que tal|como estas)(\s|$)/.test(lower)) {
    const greeting = /tardes/.test(lower)
      ? "Buenas tardes"
      : /noches/.test(lower)
        ? "Buenas noches"
        : /buen dia|buenos dias/.test(lower)
          ? "Buenos días"
          : "¡Hola!";
    return `${greeting} Soy ZOVIT IA. Me alegra conversar contigo. Estoy lista para ayudarte a revisar la plataforma, responder preguntas o recibir una orden de entrenamiento. ¿En qué trabajamos hoy?`;
  }
  if (/^(que es|que significa|define|explica) zovit\b|\bpara que sirve zovit\b|\bcual es (el )?(objetivo|proposito) de zovit\b/.test(lower)) {
    return "ZOVIT es un ecosistema chileno de servicios y confianza creado por Jorge Andrés Salas Guzmán. Conecta a personas que necesitan un trabajo con profesionales, alumnos y especialistas que pueden realizarlo. Verifica identidades y antecedentes, acredita formación y competencias, permite buscar por mapa, IA o categorías y protege el pago hasta que el cliente aprueba el trabajo terminado. Su propósito es que contratar y trabajar sea más seguro, claro y trazable.";
  }
  if (/\bquien (creo|fundo|invento|inicio|hizo) zovit\b|\bfundador de zovit\b|\bcreador de zovit\b/.test(lower)) {
    return "ZOVIT fue creado por Jorge Andrés Salas Guzmán. La idea nació el 22 de mayo de 2024, después de que salió a buscar trabajo y comprobó personalmente lo difícil que es encontrar una oportunidad cuando las empresas no contratan a personas sin experiencia.";
  }
  if (/\bcomo nacio zovit\b|\bhistoria de zovit\b|\borigen de zovit\b|\bpor que se creo zovit\b/.test(lower)) {
    return "La idea de ZOVIT nació el 22 de mayo de 2024. Su creador, Jorge Andrés Salas Guzmán, salió a buscar trabajo y no encontró oportunidades porque muchas empresas no contratan a personas sin experiencia. A partir de esa experiencia concibió ZOVIT: un ecosistema que permite demostrar identidad, formación, competencias y experiencia verificable, para que las personas puedan acceder a oportunidades con respaldo y para que los clientes contraten con mayor confianza.";
  }
  if (/\bquien es jorge andres salas guzman\b|\bquien es jorge salas\b/.test(lower)) {
    return "Jorge Andrés Salas Guzmán es el creador y fundador de ZOVIT. Transformó una dificultad personal para encontrar trabajo sin experiencia en la idea de construir un ecosistema que conecte talento, evidencia, oportunidades y servicios confiables.";
  }
  if (/\bcomo funciona zovit\b|\bcomo se usa zovit\b/.test(lower)) {
    return "ZOVIT funciona así: la persona crea y verifica su cuenta; el cliente publica lo que necesita; profesionales autorizados envían ofertas; el cliente elige; el pago queda protegido dentro de ZOVIT; el trabajo se realiza y el dinero solo se libera cuando el cliente lo aprueba. La experiencia terminada queda como trayectoria verificable.";
  }
  if (/\bpor que (usar|elegir) zovit\b|\bque diferencia a zovit\b/.test(lower)) {
    return "ZOVIT se diferencia porque no entrega solamente un contacto: verifica identidad y evidencia, organiza el servicio, mantiene trazabilidad y protege el pago. El cliente elige con mayor respaldo y el profesional construye reputación mediante trabajos comprobables.";
  }
  if (/\bquienes (usan|pueden usar) zovit\b|\bpara quien es zovit\b/.test(lower)) {
    return "ZOVIT está diseñado para clientes, profesionales, alumnos, empresas e instituciones. Cada perfil tiene permisos y procesos distintos, pero todos se conectan mediante identidad, evidencia, competencias, servicios y trazabilidad.";
  }
  if (/\bque (sabes|aprendiste)\b|entrenamiento|conocimiento/.test(lower)) {
    return `Tengo ${training?.knowledgeUnits ?? 0} conocimientos aprobados en ${training?.domains.length ?? 0} dominios y ${orders.length} orden(es) privadas registradas. Puedo orientarte sobre perfiles, documentos, evaluaciones, matching, pagos protegidos y seguridad.`;
  }
  if (/estado|activo|revision|desactivado/.test(lower)) {
    return "En ZOVIT, activo se muestra en verde, en revisión en naranjo y desactivado o suspendido en rojo. Puedo explicar o supervisar el estado, pero no cambiarlo sin una acción autorizada del superadministrador.";
  }
  if (/document|certific|cedula|carnet/.test(lower)) {
    return "Los documentos se centralizan como evidencia. Deben revisarse por legibilidad, vigencia, correspondencia e integridad. Si hay dudas, propongo una observación y derivo a revisión humana; no apruebo ni rechazo por mi cuenta.";
  }
  if (/evaluacion|prueba|nota/.test(lower)) {
    return "Las evaluaciones deben corresponder a la competencia respaldada. La aprobación mínima es 4,0 en escala de 1,0 a 7,0. Puedo ayudar a diseñar y revisar preguntas, pero la habilitación final requiere el flujo autorizado.";
  }
  if (/pago|cobro|retiro|disputa|comision/.test(lower)) {
    return "El pago permanece protegido hasta la aprobación del trabajo. Disputas, devoluciones, retiros, comisiones y trabajos adicionales requieren trazabilidad y autoridad humana; no ejecuto movimientos de dinero.";
  }
  if (/quien eres|presentate/.test(lower)) {
    return "Soy ZOVIT IA, asistente operativo privado del superadministrador. Aprendo únicamente de fuentes aprobadas y de tus órdenes autenticadas, con límites de seguridad y auditoría.";
  }
  return "Entendí tu mensaje. Puedo convertirlo en una orden de entrenamiento si seleccionas “Guardar como orden”. Si es una consulta, necesito que indiques el módulo o proceso de ZOVIT para darte una respuesta más precisa.";
}

export async function loadAiConversation(userId: string) {
  const memory = await loadAiPrivateMemory(userId);
  return {
    messages: ((memory.messages as AiConversationMessage[] | undefined) ?? []).slice(-60),
    orders: ((memory.orders as AiTrainingOrder[] | undefined) ?? []).slice(-100),
    history: ((memory.history as ZovitHistoryEvent[] | undefined) ?? []).slice(-200),
  };
}

export async function sendAiMessage(userId: string, text: string, asOrder: boolean, training: ZovitAiTraining | null) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 2000) throw new Error("Escribe un mensaje de hasta 2.000 caracteres.");
  const memory = await loadAiPrivateMemory(userId);
  const messages = ((memory.messages as AiConversationMessage[] | undefined) ?? []).slice(-58);
  const orders = ((memory.orders as AiTrainingOrder[] | undefined) ?? []).slice(-99);
  const history = ((memory.history as ZovitHistoryEvent[] | undefined) ?? []).slice(-199);
  const now = new Date().toISOString();
  const sensitive = SENSITIVE.test(trimmed);
  const privateSearch = !asOrder && isPrivateDocumentSearch(trimmed);
  const historyEntry = !asOrder && !privateSearch ? historyDetails(trimmed) : null;
  const userMessage: AiConversationMessage = { id: `owner-${Date.now()}`, role: "superadmin", text: privateSearch ? "Buscar un documento personal autorizado por RUT." : trimmed, createdAt: now, kind: asOrder ? "training_order" : "message" };
  let nextOrders = orders;
  let responseText: string;
  let responseLinks: AiMessageLink[] | undefined;
  let nextHistory = history;
  if (asOrder) {
    const order: AiTrainingOrder = { id: `order-${Date.now()}`, instruction: trimmed, createdAt: now, sensitive, status: sensitive ? "requires_review" : "learned" };
    nextOrders = [...orders, order];
    responseText = sensitive
      ? "Orden registrada. Detecté una acción sensible: la aprenderé como instrucción, pero no la ejecutaré sin tu confirmación explícita en el módulo correspondiente."
      : "Orden recibida y guardada en mi memoria privada de entrenamiento. La aplicaré como orientación dentro de los límites de seguridad de ZOVIT.";
  } else if (historyEntry) {
    const dateMatch = historyEntry.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})\b/);
    const event: ZovitHistoryEvent = { id: `history-${Date.now()}`, date: dateMatch?.[1] ?? now.slice(0, 10), details: historyEntry, createdAt: now, createdBy: userId };
    nextHistory = [...history, event];
    responseText = `Hito guardado en la Historia de ZOVIT con fecha ${event.date}. Quedó separado de los documentos personales y de las órdenes operativas.`;
  } else if (privateSearch) {
    const rut = extractRut(trimmed)!;
    const record = await findStudentEnrollmentByRut(rut);
    if (record) {
      responseText = `Encontré el documento solicitado de ${record.personName}. El enlace es privado y exige tu sesión de superadministrador.`;
      responseLinks = [{ label: `Abrir ${record.label}`, href: `/api/intranet/ai-documents/open?rut=${encodeURIComponent(rut)}` }];
    } else responseText = "No encontré un certificado de alumno regular asociado a esos datos. Revisa el RUT y que el archivo haya terminado de cargarse.";
  } else responseText = answer(trimmed, training, orders);
  const assistantMessage: AiConversationMessage = { id: `ai-${Date.now()}`, role: "assistant", text: responseText, links: responseLinks, createdAt: new Date().toISOString(), kind: "message" };
  const nextMessages = [...messages, userMessage, assistantMessage];
  await saveAiPrivateMemory(userId, { ...memory, messages: nextMessages, orders: nextOrders, history: nextHistory });
  return { messages: nextMessages, orders: nextOrders, history: nextHistory };
}
