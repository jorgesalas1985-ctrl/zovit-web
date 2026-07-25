import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  HandCoins,
  LockKeyhole,
  MessageSquareText,
  ScanFace,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "¿Por qué ZOVIT? | ZOVIT",
  description:
    "Descubre por qué elegir ZOVIT: profesionales verificados, pago protegido, experiencia demostrable y un proceso pensado para clientes y trabajadores en Chile.",
};

const REASONS = [
  {
    title: "Identidad verificada",
    description:
      "Cliente y profesional se registran con verificación real. Menos perfiles falsos, más tranquilidad al abrir la puerta o al aceptar un trabajo.",
    icon: ScanFace,
  },
  {
    title: "Pago solo al aprobar",
    description:
      "El dinero queda protegido y se libera cuando tú apruebas el trabajo terminado. Así se reduce el riesgo de no cobro o de pagar por algo incompleto.",
    icon: HandCoins,
  },
  {
    title: "Profesionales con historial",
    description:
      "Cada servicio aprobado suma experiencia verificable. No es un CV inventado: es trayectoria respaldada por ZOVIT.",
    icon: BadgeCheck,
  },
  {
    title: "Dos formas de buscar",
    description:
      "Describe tu necesidad con IA o navega categorías a mano. Llegas más rápido al servicio correcto.",
    icon: Sparkles,
  },
  {
    title: "Misma plataforma para ambos",
    description:
      "Quien necesita ayuda y quien trabaja usan el mismo estándar de seguridad. La confianza no es unilateral.",
    icon: ShieldCheck,
  },
  {
    title: "Todo en un solo flujo",
    description:
      "Solicita, recibe ofertas, sigue el avance y libera el pago sin saltar entre apps o conversaciones sueltas.",
    icon: MessageSquareText,
  },
] as const;

const FOR_CLIENTS = [
  "Sabes con quién estás tratando",
  "El pago se libera solo cuando apruebas",
  "Puedes comparar profesionales con historial real",
] as const;

const FOR_PROS = [
  "Construyes reputación verificable",
  "Obtienes certificado/credencial para postular",
  "Cobras con respaldo de la plataforma",
] as const;

export default function PorQueZovitPage() {
  const registerClientHref = "/seguridad";

  return (
    <main className="securityPage">
      <section className="securityHero">
        <div className="securityHeroInner">
          <Link href="/" className="browseBackLink securityBack">
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
          <p className="kicker">¿POR QUÉ ZOVIT?</p>
          <h1>Elige una plataforma hecha para confiar, no solo para publicar avisos</h1>
          <p className="securityLead">
            ZOVIT conecta a quien necesita un servicio con profesionales verificados en Chile. El
            foco es simple: identidad real, trabajo claro y pago protegido hasta que apruebas.
          </p>
          <div className="securityHeroActions">
            <Link href={registerClientHref} className="primaryButton">
              Solicitar un servicio <ArrowRight size={18} />
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
              <p className="kicker">MOTIVOS CLAROS</p>
              <h2>Por qué elegir ZOVIT</h2>
              <p className="muted">
                No competimos por ser “otro listado”. Competimos por reducir riesgos en cada servicio.
              </p>
            </div>
          </div>

          <div className="securityProtectGrid">
            {REASONS.map(({ title, description, icon: Icon }) => (
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
              <p className="kicker">PARA CADA LADO</p>
              <h2>Beneficios concretos</h2>
              <p className="muted">La misma plataforma, con reglas que cuidan a ambos.</p>
            </div>
          </div>

          <div className="whySplitGrid">
            <article className="securityProtectCard">
              <div className="securityProtectIcon">
                <LockKeyhole size={22} />
              </div>
              <h3>Si necesitas un servicio</h3>
              <ul className="whyBulletList">
                {FOR_CLIENTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href={registerClientHref} className="textLink">
                Ver cómo registrarte <ArrowRight size={16} />
              </Link>
            </article>

            <article className="securityProtectCard">
              <div className="securityProtectIcon">
                <BriefcaseBusiness size={22} />
              </div>
              <h3>Si quieres trabajar</h3>
              <ul className="whyBulletList">
                {FOR_PROS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/profesionales-verificados" className="textLink">
                Ver profesionales verificados <ArrowRight size={16} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="securitySection">
        <div className="securityCtaCard">
          <p className="kicker">EMPIEZA AHORA</p>
          <h2>Confianza primero. Pago al final.</h2>
          <p>
            Crea tu cuenta, verifica tu identidad y usa ZOVIT para solicitar o trabajar con respaldo.
          </p>
          <div className="securityHeroActions">
            <Link href="/registro" className="primaryButton">
              Crear cuenta <ArrowRight size={18} />
            </Link>
            <Link href="/ia" className="textLink">
              Probar búsqueda con IA
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
