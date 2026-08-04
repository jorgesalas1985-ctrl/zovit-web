export type QuickHelpAnswer = {
  answer: string;
  links: Array<{ href: string; label: string }>;
  confidence: "high" | "medium";
};

const FAQ: Array<{
  keys: string[];
  answer: string;
  links: Array<{ href: string; label: string }>;
}> = [
  {
    keys: ["verificar", "verificacion", "identidad", "carnet", "biometria", "selfie"],
    answer:
      "La verificación es automática: subes carnet + selfie y la IA revisa RUT y fecha de nacimiento. Si todo coincide, se aprueba al instante; si queda dudoso, un humano lo revisa. Ve a Verificación o completa el registro biométrico.",
    links: [
      { href: "/verificacion", label: "Ir a verificación" },
      { href: "/registro/biometria", label: "Biometría" },
    ],
  },
  {
    keys: ["pagar", "pago", "mercadopago", "escrow", "protegido", "cuota"],
    answer:
      "El pago es protegido: el cliente paga al aceptar la propuesta y el dinero se libera cuando aprueba el trabajo. Puedes pagar con Mercado Pago (incluidas cuotas). Si el retorno queda pendiente, ZOVIT reconcilia el pago automáticamente.",
    links: [
      { href: "/pagos", label: "Mis pagos" },
      { href: "/por-que-zovit", label: "Cómo funciona el pago protegido" },
    ],
  },
  {
    keys: ["certificado", "credencial", "folio", "duoc", "validar"],
    answer:
      "Puedes emitir gratis tu Certificado de Experiencia Profesional con folio ZV-… y QR. Cualquiera lo valida en /certificados/validar. También existe la credencial viva en /credencial.",
    links: [
      { href: "/certificado-experiencia", label: "Emitir certificado" },
      { href: "/certificados/validar", label: "Validar certificado" },
    ],
  },
  {
    keys: ["solicitud", "trabajo", "profesional", "propuesta", "postular"],
    answer:
      "Cliente: publica en Nueva solicitud y ZOVIT invita solos a profesionales compatibles. Profesional: revisa Trabajos o notificaciones y envía propuesta. El chat se abre con protección de contacto hasta el pago.",
    links: [
      { href: "/solicitudes/nueva", label: "Nueva solicitud" },
      { href: "/trabajos", label: "Ver trabajos" },
    ],
  },
  {
    keys: ["cancelar", "cancelacion", "cargo", "3000"],
    answer:
      "Cancelar una solicitud real puede generar un cargo mínimo de $3.000 según las reglas. Si hay cargo pendiente, debes pagarlo antes de publicar otra. Revisa Pagos.",
    links: [{ href: "/pagos", label: "Ver cargos / pagos" }],
  },
  {
    keys: ["cobrar", "retiro", "payout", "billetera", "wallet"],
    answer:
      "Cuando el cliente aprueba el trabajo, el pago se libera a tu billetera ZOVIT. Luego puedes solicitar retiro desde Pagos profesional. Los retiros los procesa finanzas (automatización de banco en camino).",
    links: [{ href: "/pagos/profesional", label: "Pagos profesional" }],
  },
  {
    keys: ["trabajador", "credencial", "titulo", "licencia", "documento"],
    answer:
      "Al enviar tu registro de trabajador, la IA revisa certificados/licencias automáticamente. Aprobados pasan solos; dudosos van a RR.HH. Sube fotos claras (JPG/PNG) para respuesta más rápida.",
    links: [{ href: "/registro/trabajador", label: "Registro trabajador" }],
  },
  {
    keys: ["ia", "buscar", "especialidad", "categoria"],
    answer:
      "Describe el problema en Buscar con IA y ZOVIT sugiere categoría, especialidad y profesionales. Luego puedes publicar la solicitud con un clic.",
    links: [{ href: "/ia", label: "Buscar con IA" }],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function answerQuickHelp(question: string): QuickHelpAnswer {
  const q = normalize(question);
  if (!q) {
    return {
      answer: "Escribe tu duda (pago, verificación, certificado, trabajos…) y te respondo al instante.",
      links: [{ href: "/ayuda", label: "Centro de ayuda" }],
      confidence: "medium",
    };
  }

  let best: (typeof FAQ)[number] | null = null;
  let bestScore = 0;

  for (const item of FAQ) {
    let score = 0;
    for (const key of item.keys) {
      if (q.includes(key)) score += key.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best && bestScore > 0) {
    return { answer: best.answer, links: best.links, confidence: "high" };
  }

  return {
    answer:
      "Puedo ayudarte con verificación, pagos protegidos, certificados, solicitudes y registro de trabajador. Reformula con una de esas palabras o revisa el centro de ayuda.",
    links: [
      { href: "/ayuda", label: "Centro de ayuda" },
      { href: "/verificacion", label: "Verificación" },
      { href: "/pagos", label: "Pagos" },
    ],
    confidence: "medium",
  };
}

export async function answerHelpWithOptionalAi(question: string): Promise<QuickHelpAnswer> {
  // Sin APIs externas: solo respuestas locales.
  return answerQuickHelp(question);
}
