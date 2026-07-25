import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  EyeOff,
  HandCoins,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Registro seguro | ZOVIT",
  description:
    "Conoce el proceso de registro y verificación de ZOVIT: protege a clientes y profesionales contra fraudes, robos e identidades falsas.",
};

const STEPS = [
  {
    step: "01",
    title: "Crear tu cuenta",
    description:
      "Elige si necesitas un servicio o si quieres trabajar. Ingresas tus datos básicos y una contraseña segura.",
    icon: UserRound,
  },
  {
    step: "02",
    title: "Verificación de identidad",
    description:
      "Validamos tu identidad con documento y biometría. Así sabemos que eres una persona real, no un perfil falso.",
    icon: ScanFace,
  },
  {
    step: "03",
    title: "Operar con confianza",
    description:
      "Como cliente publicas solicitudes. Como profesional ofreces y ejecutas trabajos. Ambos quedan identificados en la plataforma.",
    icon: BadgeCheck,
  },
  {
    step: "04",
    title: "Pago protegido",
    description:
      "El dinero se libera solo cuando el cliente aprueba el trabajo. Reduce estafas, trabajos no pagados y desaparecidos.",
    icon: HandCoins,
  },
] as const;

const PROTECTIONS = [
  {
    title: "Menos perfiles falsos",
    description: "Sin registro abierto anónimo. Cada usuario pasa por verificación antes de operar.",
    icon: EyeOff,
  },
  {
    title: "Menos riesgo de robo o fraude",
    description:
      "Identidad trazable desalienta estafas, accesos a domicilio sin respaldo y cobros fraudulentos.",
    icon: ShieldCheck,
  },
  {
    title: "Misma regla para ambos lados",
    description:
      "Cliente y profesional se verifican. La seguridad no es solo para uno: protege a quienes contratan y a quienes trabajan.",
    icon: LockKeyhole,
  },
] as const;

export default function SeguridadPage() {
  const registerClientHref = `/registro?next=${encodeURIComponent("/solicitudes/nueva")}`;

  return (
    <main className="securityPage">
      <section className="securityHero">
        <div className="securityHeroInner">
          <Link href="/" className="browseBackLink securityBack">
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
          <p className="kicker">SEGURIDAD ZOVIT</p>
          <h1>Registro y verificación para proteger a clientes y profesionales</h1>
          <p className="securityLead">
            En ZOVIT no basta con “crear un usuario”. Pedimos identidad verificada para reducir robos,
            fraudes, perfiles falsos y trabajos sin respaldo. Así puedes solicitar o trabajar con más
            tranquilidad.
          </p>
          <div className="securityHeroActions">
            <Link href={registerClientHref} className="primaryButton">
              Regístrate para solicitar <ArrowRight size={18} />
            </Link>
            <Link href="/registro" className="secondaryButton">
              <BriefcaseBusiness size={18} /> Quiero trabajar con Zovit
            </Link>
          </div>
        </div>
      </section>

      <section className="securitySection">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">PROCESO</p>
              <h2>Así es el registro en ZOVIT</h2>
              <p className="muted">
                Un flujo claro, igual de exigente para quien pide un servicio y para quien lo realiza.
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

      <section className="securitySection securitySectionAlt">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">PARA QUÉ SIRVE</p>
              <h2>Seguridad real, no solo un formulario</h2>
              <p className="muted">
                El registro existe para cuidar a las personas y al dinero que se mueve en cada servicio.
              </p>
            </div>
          </div>

          <div className="securityProtectGrid">
            {PROTECTIONS.map(({ title, description, icon: Icon }) => (
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

      <section className="securitySection">
        <div className="securityCtaCard">
          <p className="kicker">SIGUIENTE PASO</p>
          <h2>Listo para crear tu cuenta verificada</h2>
          <p>
            Empieza el registro ahora. Luego completas la verificación de identidad y ya puedes
            solicitar servicios o trabajar en ZOVIT.
          </p>
          <div className="securityHeroActions">
            <Link href={registerClientHref} className="primaryButton">
              Empezar registro <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="textLink">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
