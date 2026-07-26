import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de seguridad",
  description:
    "Política de seguridad de ZOVIT: verificación de identidad, protección de datos, pagos seguros y prevención de fraudes.",
  robots: { index: true, follow: true },
};

const UPDATED_AT = "25 de julio de 2026";

export default function SecurityPolicyPage() {
  return (
    <main className="simplePage">
      <section className="formPageCard legalPageCard">
        <p className="kicker">LEGAL</p>
        <h1>Política de seguridad</h1>
        <p className="muted legalIntro">
          Esta política describe las medidas y prácticas de seguridad que ZOVIT aplica para proteger
          a clientes, profesionales y la integridad de la plataforma.
        </p>
        <p className="legalMeta">Última actualización: {UPDATED_AT}</p>

        <div className="legalContent">
          <h2>1. Objetivo</h2>
          <p>
            El objetivo de esta Política de Seguridad es reducir riesgos de fraude, suplantación de
            identidad, acceso no autorizado, manipulación de información y abusos en el uso de
            ZOVIT, manteniendo un entorno confiable para solicitar y prestar servicios.
          </p>
          <p>
            Complementa los{" "}
            <Link href="/legal/terminos">Términos y condiciones</Link> y la{" "}
            <Link href="/legal/privacidad">Política de privacidad</Link>.
          </p>

          <h2>2. Alcance</h2>
          <p>Aplica a:</p>
          <ul>
            <li>Usuarios registrados (clientes y profesionales).</li>
            <li>Procesos de registro, verificación, solicitudes, trabajos y pagos.</li>
            <li>Personal autorizado de ZOVIT que administra la plataforma.</li>
            <li>Sistemas, aplicaciones, bases de datos y proveedores tecnológicos asociados.</li>
          </ul>

          <h2>3. Principios de seguridad</h2>
          <ul>
            <li>
              <strong>Identidad primero:</strong> operar en ZOVIT requiere verificación razonable de
              identidad.
            </li>
            <li>
              <strong>Mínimo privilegio:</strong> cada persona o sistema accede solo a lo necesario
              para su función.
            </li>
            <li>
              <strong>Defensa en profundidad:</strong> se combinan controles técnicos, operativos y
              de proceso.
            </li>
            <li>
              <strong>Trazabilidad:</strong> las acciones relevantes deben poder auditarse cuando
              corresponda.
            </li>
            <li>
              <strong>Mejora continua:</strong> las medidas se revisan ante nuevos riesgos o
              incidentes.
            </li>
          </ul>

          <h2>4. Verificación de identidad y biometría</h2>
          <p>
            Para reducir perfiles falsos y fraudes, ZOVIT puede exigir documento de identidad,
            selfie, prueba de vida y otros antecedentes. Los datos biométricos y documentos se
            tratan con finalidad de verificación y seguridad, conforme a la Política de Privacidad.
          </p>
          <p>
            ZOVIT puede rechazar, solicitar nueva verificación o suspender cuentas cuando existan
            indicios de falsedad, inconsistencia, uso de documentos ajenos o riesgo para terceros.
          </p>

          <h2>5. Cuentas y control de acceso</h2>
          <ul>
            <li>El acceso se realiza con credenciales personales (correo y contraseña).</li>
            <li>
              El usuario debe usar contraseñas robustas y no compartirlas con terceros.
            </li>
            <li>
              Se recomienda cerrar sesión en dispositivos compartidos y reportar accesos sospechosos.
            </li>
            <li>
              ZOVIT puede aplicar bloqueos temporales, revisión manual o autenticaciones adicionales
              ante actividad anómala.
            </li>
          </ul>

          <h2>6. Seguridad de la información</h2>
          <p>ZOVIT aplica controles razonables y proporcionales, que pueden incluir:</p>
          <ul>
            <li>Comunicaciones cifradas (HTTPS/TLS) entre el navegador y la plataforma.</li>
            <li>Almacenamiento de datos en infraestructura con controles de acceso.</li>
            <li>Separación de ambientes y privilegios administrativos restringidos.</li>
            <li>Monitoreo de errores, disponibilidad y eventos de seguridad relevantes.</li>
            <li>
              Uso de proveedores especializados (por ejemplo, autenticación, almacenamiento o pagos)
              con estándares de la industria.
            </li>
          </ul>

          <h2>7. Pagos protegidos</h2>
          <p>
            Cuando el flujo de pago protegido está activo, los fondos asociados a un servicio pueden
            quedar resguardados hasta la aprobación del Cliente. Esto busca reducir estafas de
            “pago anticipado sin entrega” y trabajos no pagados.
          </p>
          <p>
            ZOVIT no almacena datos completos de tarjetas bancarias en sus propios sistemas cuando el
            cobro se procesa mediante pasarelas de pago. Las reglas de liberación, disputas y plazos
            se rigen por los términos de uso y las condiciones del proveedor de pagos.
          </p>

          <h2>8. Prevención de fraude y abuso</h2>
          <p>ZOVIT puede detectar y actuar frente a conductas como:</p>
          <ul>
            <li>Suplantación de identidad o documentos adulterados.</li>
            <li>Múltiples cuentas creadas para evadir suspensiones.</li>
            <li>Solicitudes o ofertas engañosas.</li>
            <li>Intentos de eludir el pago protegido o las calificaciones.</li>
            <li>
              Compartir teléfono, WhatsApp u otros contactos para acordar o cobrar fuera de ZOVIT.
            </li>
            <li>Acoso, amenazas o uso de la plataforma para delitos.</li>
          </ul>
          <p>
            Las medidas pueden incluir advertencias, suspensión, bloqueo de cuenta, retención de
            operaciones en revisión y colaboración con autoridades cuando la ley lo exija.
          </p>

          <h2>9. Seguridad operativa entre usuarios</h2>
          <p>
            Aunque ZOVIT verifica identidad y ofrece mecanismos de protección, el servicio presencial
            ocurre entre particulares. Se recomienda:
          </p>
          <ul>
            <li>Verificar la credencial o perfil del profesional dentro de ZOVIT.</li>
            <li>
              Mantener la comunicación, precios y trabajos adicionales dentro de la app; si surge
              trabajo extra, agrégalo y págalo en ZOVIT.
            </li>
            <li>No compartir códigos, claves o datos bancarios fuera de los canales seguros.</li>
            <li>
              Reportar comportamientos sospechosos al soporte de ZOVIT de inmediato.
            </li>
          </ul>

          <h2>10. Personal interno y proveedores</h2>
          <p>
            El acceso interno a información sensible (por ejemplo, revisiones de verificación) está
            limitado a personal autorizado. Los proveedores tecnológicos deben cumplir
            obligaciones de confidencialidad y seguridad compatibles con esta política.
          </p>

          <h2>11. Gestión de incidentes</h2>
          <p>
            Ante un incidente de seguridad relevante, ZOVIT podrá investigar, contener el riesgo,
            restaurar servicios y, cuando corresponda, informar a usuarios afectados y/o autoridades
            según la normativa aplicable.
          </p>
          <p>
            Si detectas una vulnerabilidad o un uso indebido, debes reportarlo por los canales
            oficiales de contacto de ZOVIT y no explotarlo ni difundirlo de forma que aumente el
            daño.
          </p>

          <h2>12. Conservación y eliminación</h2>
          <p>
            Los datos se conservan el tiempo necesario para operar la plataforma, cumplir
            obligaciones legales, resolver disputas y prevenir fraudes. Luego pueden eliminarse o
            anonimizarse conforme a la Política de Privacidad y la ley aplicable.
          </p>

          <h2>13. Responsabilidades del usuario</h2>
          <ul>
            <li>Entregar información veraz en el registro y verificación.</li>
            <li>Proteger sus credenciales y dispositivos.</li>
            <li>Usar ZOVIT de buena fe y conforme a la ley.</li>
            <li>Actualizar datos de contacto para recibir alertas de seguridad.</li>
          </ul>

          <h2>14. Limitaciones</h2>
          <p>
            Ningún sistema es 100% invulnerable. ZOVIT aplica medidas razonables, pero no puede
            garantizar la ausencia total de riesgos, ataques de terceros o incumplimientos entre
            usuarios. Esta política no sustituye el cuidado personal ni las obligaciones legales de
            cada parte.
          </p>

          <h2>15. Actualizaciones</h2>
          <p>
            ZOVIT puede actualizar esta Política de Seguridad para reflejar mejoras técnicas,
            cambios legales o nuevos riesgos. La versión vigente se publica en esta página con su
            fecha de actualización.
          </p>

          <h2>16. Contacto de seguridad</h2>
          <p>
            Para reportes de seguridad, cuentas comprometidas o consultas sobre esta política,
            utiliza los canales de soporte disponibles en zovit.cl o los medios de contacto
            publicados en la plataforma.
          </p>
          <p>
            También puedes revisar la explicación pública del enfoque de confianza en{" "}
            <Link href="/seguridad">Seguridad ZOVIT</Link>.
          </p>
        </div>

        <div className="legalActions">
          <Link href="/legal/terminos" className="secondaryButton wide">
            Ver términos y condiciones
          </Link>
          <Link href="/" className="secondaryButton wide">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
