import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  Copy,
  FileBadge2,
  GraduationCap,
  History,
  Mail,
  MessageCircle,
  Printer,
  ScanFace,
  Share2,
  Star,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Profesionales verificados | ZOVIT",
  description:
    "ZOVIT crea un certificado gratuito y verificable para presentar en postulaciones. Compártelo por correo, WhatsApp, imprímelo o envía el enlace.",
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
      "Puede sumar certificados de estudios u otros respaldos. Eso refuerza confianza frente a clientes y empleadores.",
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
    title: "Experiencia verificable + certificado",
    description:
      "Cada trabajo aprobado suma a tu historial. ZOVIT genera una credencial/certificado gratuito para presentarlo donde postules.",
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
      "Clientes y empleadores ven trabajos completados, ratings y nivel de experiencia.",
    icon: Star,
  },
  {
    title: "Certificado gratuito ZOVIT",
    description:
      "Recibes una credencial digital gratis, con QR verificable, lista para postular o mostrar en tu lugar de trabajo.",
    icon: FileBadge2,
  },
] as const;

const SHARE_FEATURES = [
  {
    title: "Correo",
    description: "Envía el certificado por email a un empleador o RR.HH.",
    icon: Mail,
  },
  {
    title: "WhatsApp",
    description: "Comparte el enlace o la credencial al instante por chat.",
    icon: MessageCircle,
  },
  {
    title: "Imprimir",
    description: "Imprime o guarda en PDF para llevar a una entrevista.",
    icon: Printer,
  },
  {
    title: "Copiar enlace",
    description: "Copia el link público con QR para pegarlo donde quieras.",
    icon: Copy,
  },
  {
    title: "Compartir",
    description: "Usa el menú nativo del celular o PC (LinkedIn, Drive, etc.).",
    icon: Share2,
  },
  {
    title: "LinkedIn y más",
    description: "Publica el enlace en LinkedIn, Telegram, SMS u otras apps del dispositivo.",
    icon: Share2,
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
          <h1>Verificación para acumular experiencia y obtener un certificado gratuito</h1>
          <p className="securityLead">
            En ZOVIT, verificar a un profesional no es solo “aprobar una cuenta”. Es el punto de
            partida para construir un historial real y recibir un certificado digital gratuito,
            pensado para presentarlo en postulaciones y lugares de trabajo.
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
                experiencia verificable y alimenta tu certificado.
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
              <p className="kicker">CERTIFICADO GRATUITO</p>
              <h2>Preséntalo donde postules</h2>
              <p className="muted">
                ZOVIT crea una credencial/certificado digital con tu identidad y experiencia
                verificable. Es gratis y puedes compartirlo como quieras.
              </p>
            </div>
          </div>

          <div className="certificateHighlight">
            <div className="certificateHighlightIcon">
              <FileBadge2 size={28} />
            </div>
            <div>
              <h3>Certificado ZOVIT para trabajo y postulaciones</h3>
              <p>
                Úsalo para demostrar ante un empleador, cliente o empresa que tu identidad y
                trayectoria están respaldadas por la plataforma. Incluye enlace público y código QR
                para verificar en línea.
              </p>
            </div>
          </div>

          <div className="securityProtectGrid certificateShareGrid">
            {SHARE_FEATURES.map(({ title, description, icon: Icon }) => (
              <article key={title} className="securityProtectCard">
                <div className="securityProtectIcon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>

          <p className="certificateShareNote muted">
            Al verificar tu cuenta, accedes a <strong>Mi credencial ZOVIT</strong> en el panel:
            desde ahí puedes imprimir, enviar por correo, WhatsApp, SMS, copiar el enlace o
            compartir con otras apps.
          </p>
        </div>
      </section>

      <section className="securitySection">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">PROCESO</p>
              <h2>Cómo se verifica y crece un profesional</h2>
              <p className="muted">
                Del registro al certificado: un camino pensado para clientes y para quien trabaja.
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
          <h2>Obtén tu certificado gratuito y experiencia verificable</h2>
          <p>
            Regístrate como profesional, verifica tu identidad y comienza a sumar trabajos reales.
            Tu credencial ZOVIT queda lista para compartir e imprimir.
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
