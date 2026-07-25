import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  GraduationCap,
  History,
  ScanFace,
  Star,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Profesionales verificados | ZOVIT",
  description:
    "Conoce cómo funciona la verificación de profesionales en ZOVIT y cómo construyen experiencia verificable con cada trabajo aprobado.",
};

const STEPS = [
  {
    step: "01",
    title: "Registro e identidad",
    description:
      "El profesional crea su cuenta y completa la verificación biométrica. Confirmamos que es una persona real.",
    icon: ScanFace,
  },
  {
    step: "02",
    title: "Perfil y respaldo",
    description:
      "Puede sumar certificados de estudios u otros respaldos. Eso refuerza confianza frente a los clientes.",
    icon: GraduationCap,
  },
  {
    step: "03",
    title: "Trabajos en la plataforma",
    description:
      "Postula, realiza el servicio y espera la aprobación del cliente. Solo entonces el pago se libera.",
    icon: ClipboardCheck,
  },
  {
    step: "04",
    title: "Experiencia verificable",
    description:
      "Cada trabajo aprobado queda en su historial ZOVIT: categoría, calificación y trayectoria real, no solo un CV escrito.",
    icon: History,
  },
] as const;

const BENEFITS = [
  {
    title: "Historial que se acumula",
    description:
      "La verificación no es un sello único: abre la puerta a construir experiencia medible con trabajos reales.",
    icon: Award,
  },
  {
    title: "Reputación respaldada",
    description:
      "Clientes ven trabajos completados, ratings y nivel de experiencia. Eso ayuda a elegir con más seguridad.",
    icon: Star,
  },
  {
    title: "Credencial ZOVIT",
    description:
      "El profesional puede mostrar una credencial con su identidad y trayectoria verificada en la plataforma.",
    icon: BadgeCheck,
  },
] as const;

export default function ProfesionalesVerificadosPage() {
  return (
    <main className="securityPage">
      <section className="securityHero">
        <div className="securityHeroInner">
          <Link href="/" className="browseBackLink securityBack">
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
          <p className="kicker">PROFESIONALES VERIFICADOS</p>
          <h1>Verificación para acumular experiencia real y demostrable</h1>
          <p className="securityLead">
            En ZOVIT, verificar a un profesional no es solo “aprobar una cuenta”. Es el punto de
            partida para construir un historial verificable: trabajos terminados, calificaciones y
            trayectoria que el cliente puede confiar.
          </p>
          <div className="securityHeroActions">
            <Link href="/registro" className="primaryButton">
              <BriefcaseBusiness size={18} /> Quiero trabajar con Zovit
              <ArrowRight size={18} />
            </Link>
            <Link href="/categorias" className="secondaryButton">
              Ver categorías <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="securitySection">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">PARA QUÉ SIRVE</p>
              <h2>La verificación abre tu carrera en ZOVIT</h2>
              <p className="muted">
                Sin identidad validada no se puede operar. Con ella, cada servicio aprobado suma
                experiencia verificable a tu perfil.
              </p>
            </div>
          </div>

          <div className="securityProtectGrid">
            {BENEFITS.map(({ title, description, icon: Icon }) => (
              <article key={title} className="securityProtectCard">
                <div className="securityProtectIcon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="securitySection securitySectionAlt">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">PROCESO</p>
              <h2>Cómo se verifica y crece un profesional</h2>
              <p className="muted">
                Del registro al historial: un camino pensado para clientes y para quien trabaja.
              </p>
            </div>
          </div>

          <ol className="securitySteps">
            {STEPS.map(({ step, title, description, icon: Icon }) => (
              <li key={step} className="securityStep">
                <span className="securityStepNumber">{step}</span>
                <div className="securityStepIcon">
                  <Icon size={22} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="securitySection">
        <div className="securityCtaCard">
          <p className="kicker">EMPIEZA HOY</p>
          <h2>Construye experiencia verificable en ZOVIT</h2>
          <p>
            Regístrate como profesional, verifica tu identidad y comienza a sumar trabajos reales a
            tu historial.
          </p>
          <div className="securityHeroActions">
            <Link href="/registro" className="primaryButton">
              Crear cuenta profesional <ArrowRight size={18} />
            </Link>
            <Link href="/seguridad" className="textLink">
              Ver seguridad de la plataforma
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
