import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Política de cookies y tecnologías similares de ZOVIT: sesión, preferencias, seguridad y cómo gestionarlas.",
  robots: { index: true, follow: true },
};

const UPDATED_AT = "25 de julio de 2026";

export default function CookiesPage() {
  return (
    <main className="simplePage">
      <section className="formPageCard legalPageCard">
        <p className="kicker">LEGAL</p>
        <h1>Política de cookies</h1>
        <p className="muted legalIntro">
          Esta política explica cómo ZOVIT utiliza cookies y tecnologías similares (como
          almacenamiento local del navegador) al visitar o ingresar a la plataforma.
        </p>
        <p className="legalMeta">Última actualización: {UPDATED_AT}</p>

        <div className="legalContent">
          <h2>1. Qué son las cookies</h2>
          <p>
            Las cookies son pequeños archivos que un sitio web guarda en tu dispositivo para recordar
            información entre visitas o durante una sesión. ZOVIT también puede usar tecnologías
            similares, como <strong>localStorage</strong> y <strong>sessionStorage</strong>, para
            preferencias y datos temporales de uso.
          </p>

          <h2>2. Quién usa estas tecnologías</h2>
          <p>
            Las cookies y el almacenamiento local descritos en esta política son utilizados por ZOVIT
            y, cuando corresponde, por proveedores tecnológicos necesarios para operar la plataforma
            (por ejemplo, autenticación o infraestructura de hosting).
          </p>
          <p>
            Esta política complementa los{" "}
            <Link href="/legal/terminos">Términos y condiciones</Link>, la{" "}
            <Link href="/legal/privacidad">Política de privacidad</Link> y la{" "}
            <Link href="/legal/seguridad">Política de seguridad</Link>.
          </p>

          <h2>3. Tipos de cookies y usos en ZOVIT</h2>

          <h3>3.1 Cookies esenciales / de sesión</h3>
          <p>
            Son necesarias para que puedas iniciar sesión, mantener tu sesión activa y navegar de
            forma segura por áreas protegidas (panel, solicitudes, pagos, verificación, etc.). Sin
            ellas, funciones básicas de ingreso no operarían correctamente.
          </p>
          <ul>
            <li>Autenticación y sesión de usuario.</li>
            <li>Protección de flujos seguros y continuidad de la navegación autenticada.</li>
            <li>Operación de servicios de cuenta asociados a proveedores de autenticación.</li>
          </ul>

          <h3>3.2 Preferencias</h3>
          <p>
            Permiten recordar configuraciones de la interfaz, como el tema visual (claro/oscuro),
            para no pedirte la misma preferencia en cada visita.
          </p>
          <ul>
            <li>
              Ejemplo: preferencia de tema almacenada localmente como <code>zovit-theme</code>.
            </li>
          </ul>

          <h3>3.3 Funcionales / de proceso</h3>
          <p>
            Ayudan a completar flujos de la plataforma de forma más fluida, por ejemplo recordar
            temporalmente una selección o una recomendación mientras creas una solicitud.
          </p>
          <ul>
            <li>Datos temporales de búsqueda con IA o selección manual de servicio.</li>
            <li>Avisos o estados de interfaz asociados a una sesión de navegación.</li>
          </ul>

          <h3>3.4 Seguridad y prevención de abuso</h3>
          <p>
            Pueden usarse mecanismos técnicos para proteger la cuenta, detectar usos anómalos y
            mantener la integridad de formularios o sesiones, en línea con nuestra Política de
            Seguridad.
          </p>

          <h3>3.5 Analítica (si se habilita)</h3>
          <p>
            Si ZOVIT incorpora herramientas de medición de uso (por ejemplo, para entender qué
            páginas se visitan y mejorar el servicio), se informará y aplicará conforme a esta
            política y a la normativa aplicable. Mientras no se activen, el foco principal de cookies
            es operativo: sesión, preferencias y funcionamiento.
          </p>

          <h2>4. Tecnologías similares</h2>
          <p>Además de cookies, ZOVIT puede usar:</p>
          <ul>
            <li>
              <strong>localStorage:</strong> para preferencias que persisten entre visitas (como el
              tema).
            </li>
            <li>
              <strong>sessionStorage:</strong> para datos temporales de un flujo (por ejemplo,
              prellenar una solicitud tras una recomendación de IA).
            </li>
          </ul>
          <p>
            Estas tecnologías no siempre se gestionan igual que las cookies del navegador, pero
            cumplen un rol similar de almacenamiento en tu dispositivo.
          </p>

          <h2>5. Base y aceptación</h2>
          <p>
            Las cookies esenciales son necesarias para prestar el servicio solicitado (ingreso y
            operación de cuenta). Las preferencias y funciones auxiliares se usan para mejorar tu
            experiencia.
          </p>
          <p>
            Al continuar navegando o ingresar a ZOVIT, aceptas el uso de cookies y tecnologías
            similares según esta política, sin perjuicio de los controles que configures en tu
            navegador.
          </p>

          <h2>6. Cómo gestionar o desactivar cookies</h2>
          <p>Puedes controlar cookies desde la configuración de tu navegador. En general podrás:</p>
          <ul>
            <li>Bloquear cookies de terceros.</li>
            <li>Eliminar cookies existentes.</li>
            <li>Recibir aviso antes de que se almacene una cookie.</li>
          </ul>
          <p>
            Si bloqueas cookies esenciales, es posible que no puedas iniciar sesión o usar partes de
            la plataforma. También puedes borrar el almacenamiento local del sitio desde las
            herramientas de tu navegador si deseas reiniciar preferencias.
          </p>
          <p>Guías habituales (sujetas a cambios de cada fabricante):</p>
          <ul>
            <li>Chrome: Configuración → Privacidad y seguridad → Cookies.</li>
            <li>Edge: Configuración → Cookies y permisos del sitio.</li>
            <li>Firefox: Ajustes → Privacidad y seguridad.</li>
            <li>Safari: Preferencias → Privacidad.</li>
          </ul>

          <h2>7. Conservación</h2>
          <p>
            Las cookies de sesión suelen eliminarse al cerrar el navegador o al expirar la sesión.
            Las preferencias pueden permanecer hasta que las borres o cambies. Los datos temporales
            de flujo se eliminan al completar el proceso o al cerrar la pestaña, según el caso.
          </p>

          <h2>8. Transferencias y terceros</h2>
          <p>
            Algunos proveedores que sostienen autenticación, hosting o pagos pueden procesar datos
            técnicos asociados a cookies o sesión. Esos tratamientos se realizan para operar ZOVIT y
            se rigen también por la Política de Privacidad y los acuerdos con dichos proveedores.
          </p>

          <h2>9. Actualizaciones</h2>
          <p>
            ZOVIT puede actualizar esta Política de Cookies para reflejar cambios técnicos, legales
            o de proveedores. La versión vigente se publica en esta página con su fecha de
            actualización.
          </p>

          <h2>10. Contacto</h2>
          <p>
            Si tienes preguntas sobre cookies o privacidad en ZOVIT, contacta a través de los canales
            de soporte disponibles en zovit.cl o consulta también la{" "}
            <Link href="/legal/privacidad">Política de privacidad</Link>.
          </p>
        </div>

        <div className="legalActions">
          <Link href="/legal/privacidad" className="secondaryButton wide">
            Ver política de privacidad
          </Link>
          <Link href="/" className="secondaryButton wide">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
