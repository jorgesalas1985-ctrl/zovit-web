import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de ingreso y uso de la plataforma ZOVIT para clientes y profesionales en Chile.",
  robots: { index: true, follow: true },
};

const UPDATED_AT = "25 de julio de 2026";

export default function TermsPage() {
  return (
    <main className="simplePage">
      <section className="formPageCard legalPageCard">
        <p className="kicker">LEGAL</p>
        <h1>Términos y condiciones</h1>
        <p className="muted legalIntro">
          Estos términos regulan el ingreso, registro y uso de ZOVIT. Al crear una cuenta, iniciar
          sesión o utilizar la plataforma, declaras haberlos leído y aceptado.
        </p>
        <p className="legalMeta">Última actualización: {UPDATED_AT}</p>

        <div className="legalContent">
          <h2>1. Aceptación al ingresar</h2>
          <p>
            El acceso a ZOVIT está condicionado a la aceptación de estos Términos y Condiciones y de
            la{" "}
            <Link href="/legal/privacidad">Política de Privacidad</Link>. Si no estás de acuerdo,
            no debes registrarte ni utilizar la plataforma.
          </p>
          <p>
            El uso continuado de ZOVIT después de una actualización de estos términos constituye
            aceptación de la versión vigente, que estará publicada en esta página.
          </p>

          <h2>2. Qué es ZOVIT</h2>
          <p>
            ZOVIT es una plataforma digital que conecta a personas que necesitan un servicio
            (“Clientes”) con personas que ofrecen servicios (“Profesionales”), ambas sujetas a
            verificación de identidad. ZOVIT no es el prestador directo del servicio contratado
            entre Cliente y Profesional, salvo que se indique expresamente lo contrario.
          </p>
          <p>
            ZOVIT facilita la publicación de solicitudes, la postulación de profesionales, la
            comunicación dentro del flujo de trabajo y mecanismos de pago protegido asociados a la
            aprobación del Cliente.
          </p>

          <h2>3. Requisitos de ingreso y registro</h2>
          <p>Para ingresar y operar en ZOVIT debes:</p>
          <ul>
            <li>Ser mayor de 18 años y tener capacidad legal para contratar en Chile.</li>
            <li>Proporcionar datos verdaderos, actualizados y verificables.</li>
            <li>Crear una cuenta con correo y contraseña seguros, de uso personal e intransferible.</li>
            <li>
              Completar el proceso de verificación de identidad (incluyendo biometría y documentos
              cuando corresponda) antes de solicitar servicios o trabajar como profesional.
            </li>
            <li>Mantener la confidencialidad de tus credenciales de acceso.</li>
          </ul>
          <p>
            Eres responsable de toda actividad realizada desde tu cuenta. Debes notificar de inmediato
            cualquier uso no autorizado o sospecha de acceso indebido.
          </p>

          <h2>4. Verificación de identidad</h2>
          <p>
            ZOVIT exige verificación para reducir fraudes, perfiles falsos y riesgos de seguridad.
            Puedes estar obligado a entregar documentos de identidad, fotografía, prueba de vida u
            otros antecedentes razonables para validar tu identidad.
          </p>
          <p>
            ZOVIT puede aprobar, rechazar, suspender o solicitar nueva verificación si detecta
            inconsistencias, información falsa, documentos alterados o riesgos para la comunidad.
            La verificación no garantiza por sí sola la calidad de un servicio ni elimina todo
            riesgo entre particulares.
          </p>

          <h2>5. Roles: Cliente y Profesional</h2>
          <p>
            <strong>Cliente:</strong> puede explorar servicios, publicar solicitudes, recibir
            ofertas, seguir el avance del trabajo y aprobar o rechazar la liberación del pago según
            las reglas de la plataforma.
          </p>
          <p>
            <strong>Profesional:</strong> puede postular a trabajos, ejecutar servicios acordados,
            acumular experiencia verificable y, cuando corresponda, obtener credencial o certificado
            ZOVIT basado en su historial en la plataforma.
          </p>
          <p>
            Un mismo usuario puede operar en ambos modos solo si la plataforma lo habilita y cumple
            los requisitos de verificación aplicables a cada rol.
          </p>

          <h2>6. Obligaciones de los usuarios</h2>
          <p>Al ingresar a ZOVIT te comprometes a:</p>
          <ul>
            <li>Usar la plataforma de forma lícita, respetuosa y de buena fe.</li>
            <li>No suplantar identidades ni usar documentos de terceros.</li>
            <li>No publicar contenido falso, engañoso, ofensivo, discriminatorio o ilegal.</li>
            <li>
              No utilizar ZOVIT para estafas, robos, amenazas, acoso, lavado de activos u otras
              conductas ilícitas.
            </li>
            <li>
              Cumplir los acuerdos de servicio, plazos y condiciones pactadas dentro del flujo de
              ZOVIT.
            </li>
            <li>
              Coordinar el servicio, precios, trabajos adicionales y detalles operativos a través de
              los canales de ZOVIT (chat y funciones de la app), no por WhatsApp, teléfono, correo u
              otras vías externas, hasta que el pago correspondiente esté registrado y protegido en
              la plataforma.
            </li>
            <li>
              No eludir de mala fe los mecanismos de pago protegido, calificaciones o verificación,
              ni acordar cobros fuera de ZOVIT para evitar comisiones o controles de seguridad.
            </li>
            <li>
              Declarar en ZOVIT el precio real del servicio. Está prohibido registrar un monto menor
              al acordado para reducir la comisión de ZOVIT y cobrar la diferencia fuera de la
              plataforma (efectivo, transferencia u otro medio).
            </li>
          </ul>

          <h2>7. Solicitudes, ofertas y ejecución del servicio</h2>
          <p>
            El Cliente es responsable de describir con claridad el servicio requerido. El Profesional
            es responsable de declarar con veracidad su capacidad, disponibilidad y alcance del
            trabajo ofertado.
          </p>
          <p>
            El contrato de prestación del servicio se celebra entre Cliente y Profesional. ZOVIT
            actúa como intermediario tecnológico y puede establecer reglas operativas, estados del
            trabajo y condiciones para liberar pagos.
          </p>

          <h2>8. Pagos protegidos y trabajos adicionales</h2>
          <p>
            Cuando el flujo de pago protegido esté disponible, los fondos asociados a un servicio
            pueden quedar resguardados hasta que el Cliente apruebe el trabajo, conforme a las
            reglas y plazos publicados en la plataforma y a los proveedores de pago utilizados.
          </p>
          <p>
            Todo cobro del servicio —incluido trabajo adicional que surja en el lugar— debe crearse y
            pagarse dentro de ZOVIT por el monto real. El Cliente puede agregar trabajo adicional
            fácilmente desde la solicitud; el Profesional solo debe ejecutarlo cuando el pago
            correspondiente quede protegido en la plataforma. Acuerdos o pagos fuera de ZOVIT, o
            subdeclarar el precio para pagar menos comisión, no están protegidos y constituyen
            incumplimiento. ZOVIT puede supervisar señales de elusión (por ejemplo, montos
            mencionados en el chat distintos al pago registrado) y aplicar sanciones.
          </p>
          <p>
            ZOVIT no es un banco. Los tiempos de acreditación, comisiones, reversas o disputas pueden
            depender de pasarelas de pago, normativa aplicable y revisión de casos. El mal uso del
            sistema de aprobación o rechazo puede derivar en suspensión de cuenta.
          </p>

          <h2>9. Experiencia, calificaciones y certificado</h2>
          <p>
            Los trabajos aprobados pueden generar historial, calificaciones y, cuando corresponda,
            credencial o certificado gratuito de experiencia verificable en ZOVIT. Esa información
            refleja actividad dentro de la plataforma y no constituye título profesional estatal ni
            certificación académica oficial, salvo que se indique expresamente lo contrario.
          </p>

          <h2>10. Contenidos y propiedad intelectual</h2>
          <p>
            ZOVIT y sus marcas, diseños, software y contenidos propios están protegidos. No puedes
            copiar, modificar, distribuir ni explotar comercialmente esos elementos sin autorización.
          </p>
          <p>
            Al subir fotos, textos u otros contenidos, otorgas a ZOVIT una licencia no exclusiva para
            usarlos en la operación, seguridad, soporte y mejora de la plataforma, respetando la
            normativa de protección de datos.
          </p>

          <h2>11. Disponibilidad y cambios del servicio</h2>
          <p>
            ZOVIT busca mantener la plataforma disponible, pero no garantiza operación ininterrumpida
            ni libre de errores. Pueden existir mantenciones, actualizaciones o interrupciones.
          </p>
          <p>
            ZOVIT puede modificar funciones, comisiones, categorías o flujos operativos para mejorar
            seguridad, cumplimiento o experiencia de uso, informando cuando corresponda.
          </p>

          <h2>12. Suspensión y cierre de cuenta</h2>
          <p>ZOVIT puede suspender, bloquear o terminar el acceso si:</p>
          <ul>
            <li>Incumplen estos términos o la ley.</li>
            <li>Se detecta fraude, abuso, riesgo a terceros o falsedad en la verificación.</li>
            <li>
              Se detecta elusión del pago protegido: compartir teléfono/WhatsApp para cerrar el
              trato fuera de la app, cobrar en efectivo o transferencia directa eludiendo ZOVIT,
              omitir registrar trabajo adicional, o declarar un monto menor al real para reducir la
              comisión de ZOVIT.
            </li>
            <li>Existe inactividad prolongada o requerimiento de autoridad competente.</li>
          </ul>
          <p>
            Las cuentas pueden ser bloqueadas de forma temporal o definitiva según la gravedad del
            caso. También puedes solicitar el cierre de tu cuenta, sin perjuicio de obligaciones
            pendientes (pagos, disputas o deberes legales de conservación de información).
          </p>

          <h2>13. Limitación de responsabilidad</h2>
          <p>
            En la máxima medida permitida por la ley chilena, ZOVIT no responde por daños derivados
            de la relación directa entre Cliente y Profesional, ni por hechos fuera de su control
            razonable, incluyendo fallas de terceros, conectividad o fuerza mayor.
          </p>
          <p>
            Nada de lo anterior limita derechos irrenunciables del consumidor u otras protecciones
            legales aplicables.
          </p>

          <h2>14. Datos personales y seguridad</h2>
          <p>
            El tratamiento de datos personales, documentos y datos de verificación se rige por la{" "}
            <Link href="/legal/privacidad">Política de Privacidad</Link> y la{" "}
            <Link href="/legal/seguridad">Política de Seguridad</Link>, además de la normativa
            vigente en Chile.
          </p>

          <h2>15. Ley aplicable y jurisdicción</h2>
          <p>
            Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se
            someterá a los tribunales competentes de Santiago, sin perjuicio de normas imperativas de
            protección al consumidor que resulten aplicables.
          </p>

          <h2>16. Contacto</h2>
          <p>
            Para consultas sobre estos términos puedes escribir a través de los canales de soporte
            disponibles en la plataforma o mediante los medios de contacto publicados en zovit.cl.
          </p>
        </div>

        <div className="legalActions">
          <Link href="/registro" className="primaryButton wide">
            Ir al registro
          </Link>
          <Link href="/" className="secondaryButton wide">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
