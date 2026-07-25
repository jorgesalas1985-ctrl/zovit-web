/**
 * Correcciones ortográficas frecuentes en español (Chile).
 * Solo se aplica a texto libre (descripciones, notas), no a nombres/RUT/correo.
 */

const WORD_MAP: Record<string, string> = {
  tambien: "también",
  asi: "así",
  mas: "más",
  despues: "después",
  aqui: "aquí",
  alli: "allí",
  alla: "allá",
  solo: "sólo",
  unica: "única",
  unico: "único",
  rapido: "rápido",
  rapida: "rápida",
  facil: "fácil",
  dificil: "difícil",
  telefono: "teléfono",
  direccion: "dirección",
  informacion: "información",
  atencion: "atención",
  solucion: "solución",
  instalacion: "instalación",
  reparacion: "reparación",
  habitacion: "habitación",
  comunicacion: "comunicación",
  verificacion: "verificación",
  certificacion: "certificación",
  experiencia: "experiencia",
  experencia: "experiencia",
  profesional: "profesional",
  profesion: "profesión",
  educacion: "educación",
  capacitacion: "capacitación",
  disponiblidad: "disponibilidad",
  disponibilidad: "disponibilidad",
  horario: "horario",
  tecnico: "técnico",
  tecnica: "técnica",
  electrico: "eléctrico",
  electrica: "eléctrica",
  gasfiteria: "gasfitería",
  plomeria: "plomería",
  pintura: "pintura",
  mantenimiento: "mantenimiento",
  mantencion: "mantención",
  presupuesto: "presupuesto",
  cotizacion: "cotización",
  servicio: "servicio",
  servicios: "servicios",
  urgente: "urgente",
  manana: "mañana",
  area: "área",
  ano: "año",
  anos: "años",
  numero: "número",
  pagina: "página",
  codigo: "código",
  metodo: "método",
  practica: "práctica",
  practico: "práctico",
  basico: "básico",
  basica: "básica",
  publico: "público",
  publica: "pública",
  tipico: "típico",
  tipica: "típica",
  ultimo: "último",
  ultima: "última",
  proximo: "próximo",
  proxima: "próxima",
  minimo: "mínimo",
  maximo: "máximo",
  pais: "país",
  dias: "días",
  dia: "día",
  hora: "hora",
  horas: "horas",
  comuna: "comuna",
  region: "región",
  regiones: "regiones",
  muralla: "muralla",
  pared: "pared",
  techo: "techo",
  baño: "baño",
  bano: "baño",
  cocina: "cocina",
  living: "living",
  departamento: "departamento",
  depto: "depto",
  habria: "habría",
  podria: "podría",
  deberia: "debería",
  estaria: "estaría",
  seria: "sería",
  tenia: "tenía",
  habia: "había",
  hacia: "hacia",
  que: "que", // no tocar "que"/"qué" automáticamente
};

/** Palabras que no deben auto-corregirse (homógrafos / uso ambiguo). */
const SKIP = new Set(["que", "solo", "hacia", "depto", "experiencia", "profesional", "urgente", "horario", "pintura", "pared", "techo", "cocina", "living", "departamento", "comuna", "hora", "horas", "servicio", "servicios"]);

const WORD_RE = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g;

function correctWord(word: string): string {
  const lower = word.toLowerCase();
  if (SKIP.has(lower)) return word;
  const replacement = WORD_MAP[lower];
  if (!replacement || replacement === lower) return word;

  // Preservar mayúsculas del original
  if (word === word.toUpperCase()) return replacement.toUpperCase();
  if (word[0] === word[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function applySpanishAutocorrect(text: string): string {
  if (!text || text.length < 2) return text;
  return text.replace(WORD_RE, correctWord);
}

export function shouldAutocorrectElement(el: HTMLElement): boolean {
  if (el.dataset.spellcheck === "off" || el.dataset.autocorrect === "off") return false;
  if (el.dataset.autocorrect === "on" || el.dataset.spellcheck === "full") return true;

  if (el instanceof HTMLTextAreaElement) return true;

  if (el instanceof HTMLInputElement) {
    const type = (el.type || "text").toLowerCase();
    if (!["text", "search"].includes(type)) return false;
    const name = `${el.name} ${el.id} ${el.className} ${el.placeholder}`.toLowerCase();
    // Campos libres típicos
    if (
      /descrip|detalle|nota|mensaje|comentario|consulta|experiencia|competenc|herramient|zona|trabajo|motivo|review|message|notes|bio|about/.test(
        name
      )
    ) {
      return true;
    }
  }

  return false;
}

export function shouldEnableSpellcheck(el: HTMLElement): boolean {
  if (el.dataset.spellcheck === "off") return false;

  if (el instanceof HTMLInputElement) {
    const type = (el.type || "text").toLowerCase();
    if (
      ["password", "email", "tel", "url", "number", "date", "time", "datetime-local", "month", "week", "color", "file", "hidden", "checkbox", "radio", "range", "submit", "button", "reset"].includes(
        type
      )
    ) {
      return false;
    }
    const name = `${el.name} ${el.id} ${el.autocomplete} ${el.className}`.toLowerCase();
    if (/rut|password|passwd|otp|token|codigo-verif|verification|cvv|pin/.test(name)) {
      return false;
    }
  }

  return true;
}
