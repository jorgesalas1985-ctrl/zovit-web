import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BriefcaseBusiness } from "lucide-react";
import { getRequestServiceHref } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "¿Por qué ZOVIT? | ZOVIT",
  description:
    "La historia de por qué elegir ZOVIT: confianza, identidad verificada, pago protegido y experiencia real para clientes y profesionales en Chile.",
};

const CHAPTERS = [
  {
    number: "I",
    title: "El problema no era encontrar a alguien",
    body: [
      "En Chile siempre hubo alguien que podía pintar, arreglar, instalar o reparar. El problema era otro: ¿quién es realmente? ¿llegará? ¿cobrará y desaparecerá? ¿pagaré y el trabajo quedará a medias?",
      "Entre grupos de WhatsApp, recomendaciones a medias y avisos sin respaldo, la confianza se diluía. Quien necesitaba ayuda dudaba. Quien trabajaba bien también: porque un buen oficio se confunde fácil con un perfil inventado.",
    ],
  },
  {
    number: "II",
    title: "ZOVIT nació para cambiar esa conversación",
    body: [
      "No para ser “otro lugar donde publicar un aviso”. Sino para construir un puente seguro entre dos personas: quien necesita un servicio y quien puede hacerlo.",
      "La promesa es simple y firme: identidad real, trabajo claro y pago protegido. Tú apruebas. Solo entonces se libera el dinero.",
    ],
  },
  {
    number: "III",
    title: "Primero la persona. Después el servicio.",
    body: [
      "En ZOVIT, cliente y profesional se registran con la misma exigencia de verificación. No hay un lado “libre” y otro “controlado”. Hay una sola regla: saber con quién estás tratando.",
      "Eso reduce perfiles falsos, accesos sin respaldo y la sensación de estar jugando a la suerte. La seguridad no es un adorno: es el punto de partida.",
    ],
  },
  {
    number: "IV",
    title: "El trabajo se cuenta. La experiencia se acumula.",
    body: [
      "Cuando un servicio se completa y se aprueba, no se esfuma en un chat. Queda en un historial verificable. El profesional construye reputación con hechos. El cliente elige con evidencia, no solo con promesas.",
      "Y esa trayectoria puede convertirse en un certificado gratuito ZOVIT: algo concreto para presentar al postular, compartir o imprimir. Experiencia que se puede mostrar.",
    ],
  },
  {
    number: "V",
    title: "Por eso te conviene elegirla",
    body: [
      "Porque no te deja solo con un contacto. Te acompaña con verificación, proceso y pago al final.",
      "Porque protege a quien abre la puerta y a quien pone el oficio en juego. Porque convierte un servicio cotidiano en una relación con respaldo.",
      "ZOVIT no vende magia. Vende orden, claridad y confianza. Y en servicios, eso lo cambia todo.",
    ],
  },
] as const;

export default function PorQueZovitPage() {
  return (
    <main className="whyStoryPage">
      <section className="whyStoryHero" aria-label="Historia ZOVIT">
        <div className="whyStoryHeroGlow" aria-hidden="true" />
        <div className="whyStoryHeroInner">
          <Link href="/" className="browseBackLink whyStoryBack">
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
          <p className="whyStoryBrand">ZOVIT</p>
          <h1>Hay una razón para no dejar el servicio al azar.</h1>
          <p className="whyStoryHeroLead">
            Esta es la historia de por qué elegir ZOVIT: para que contratar o trabajar deje de ser un
            acto de fe… y pase a ser un acto de confianza.
          </p>
        </div>
      </section>

      <section className="whyStoryBody" aria-label="Por qué elegir ZOVIT">
        {CHAPTERS.map((chapter, index) => (
          <article
            key={chapter.number}
            className={`whyStoryChapter ${index % 2 === 1 ? "whyStoryChapter--alt" : ""}`}
          >
            <div className="whyStoryChapterInner">
              <p className="whyStoryChapterNum">Capítulo {chapter.number}</p>
              <h2>{chapter.title}</h2>
              {chapter.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="whyStoryClose">
        <div className="whyStoryCloseInner">
          <p className="whyStoryBrand whyStoryBrand--onDark">ZOVIT</p>
          <h2>Confianza primero. Pago al final.</h2>
          <p>
            Si necesitas un servicio o quieres trabajar con respaldo, el siguiente paso es el mismo:
            crear tu cuenta y verificar tu identidad.
          </p>
          <div className="whyStoryActions">
            <Link href={getRequestServiceHref(false)} className="primaryButton">
              Empezar como cliente <ArrowRight size={18} />
            </Link>
            <Link href="/registro" className="whiteButton">
              <BriefcaseBusiness size={18} /> Quiero trabajar con Zovit
            </Link>
          </div>
          <div className="whyStorySecondaryLinks">
            <Link href="/profesionales-verificados" className="textLink whyStoryLinkOnDark">
              Profesionales verificados
            </Link>
            <Link href="/ia" className="textLink whyStoryLinkOnDark">
              Buscar con IA
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
