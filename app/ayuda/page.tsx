import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CircleHelp,
  HandCoins,
  IdCard,
  ScanFace,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { QuickHelpAssistant } from "@/components/support/QuickHelpAssistant";

export const metadata: Metadata = {
  title: "Ayuda | ZOVIT",
  description:
    "Centro de ayuda ZOVIT para clientes y profesionales: registro, verificación, solicitudes, pagos, experiencia y credencial.",
};

const CLIENT_HELP = [
  {
    q: "¿Cómo pido un servicio?",
    a: "Regístrate, verifica tu identidad y luego describe tu necesidad con IA o elige categoría manualmente. Publica la solicitud y recibe ofertas de profesionales verificados.",
    href: "/seguridad",
    linkLabel: "Ver registro seguro",
  },
  {
    q: "¿Por qué debo verificarme?",
    a: "Para proteger a ambas partes: reduce perfiles falsos, fraudes y riesgos al contratar. En ZOVIT cliente y profesional se verifican.",
    href: "/legal/seguridad",
    linkLabel: "Política de seguridad",
  },
  {
    q: "¿Cuándo se paga?",
    a: "Con pago protegido, el dinero se libera cuando tú apruebas el trabajo terminado. Así no pagas “a ciegas” ni dejas el acuerdo solo en un chat.",
    href: "/por-que-zovit",
    linkLabel: "Por qué ZOVIT",
  },
  {
    q: "¿Puedo buscar sin saber la categoría exacta?",
    a: "Sí. Usa Buscar con IA, describe el problema con tus palabras y ZOVIT te sugiere especialidad y profesionales.",
    href: "/ia",
    linkLabel: "Ir a búsqueda con IA",
  },
] as const;

const PRO_HELP = [
  {
    q: "¿Cómo empiezo a trabajar?",
    a: "Crea tu cuenta como profesional, completa la verificación de identidad y luego postula a trabajos disponibles desde tu panel.",
    href: "/registro",
    linkLabel: "Crear cuenta profesional",
  },
  {
    q: "¿Qué es la experiencia verificable?",
    a: "Cada trabajo aprobado suma historial real en ZOVIT: no es solo un CV escrito. Esa trayectoria respalda tu reputación frente a clientes.",
    href: "/profesionales-verificados",
    linkLabel: "Profesionales verificados",
  },
  {
    q: "¿Qué es el certificado o credencial ZOVIT?",
    a: "Es un respaldo gratuito que puedes presentar, imprimir o compartir (correo, WhatsApp y más) para postular o demostrar tu identidad y trayectoria en la plataforma.",
    href: "/profesionales-verificados",
    linkLabel: "Ver cómo funciona",
  },
  {
    q: "¿Cuándo cobro?",
    a: "Cuando el cliente aprueba el trabajo y se libera el pago protegido, según las reglas del flujo de pagos de la plataforma.",
    href: "/legal/terminos",
    linkLabel: "Términos y condiciones",
  },
] as const;

const QUICK_LINKS = [
  { href: "/registro", label: "Crear cuenta", icon: UserRound },
  { href: "/login", label: "Ingresar", icon: ScanFace },
  { href: "/ia", label: "Buscar con IA", icon: Search },
  { href: "/categorias", label: "Búsqueda manual", icon: BriefcaseBusiness },
  { href: "/seguridad", label: "Registro seguro", icon: ShieldCheck },
  { href: "/profesionales-verificados", label: "Experiencia verificable", icon: BadgeCheck },
  { href: "/por-que-zovit", label: "¿Por qué ZOVIT?", icon: CircleHelp },
  { href: "/legal/terminos", label: "Términos legales", icon: IdCard },
] as const;

export default function AyudaPage() {
  return (
    <main className="securityPage">
      <section className="securityHero">
        <div className="securityHeroInner">
          <Link href="/" className="browseBackLink securityBack">
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
          <p className="kicker">CENTRO DE AYUDA</p>
          <h1>Ayuda para clientes y profesionales</h1>
          <p className="securityLead">
            Respuestas claras para registrarte, verificar tu identidad, solicitar un servicio,
            trabajar en ZOVIT, entender el pago protegido y usar tu credencial.
          </p>
          <div className="securityHeroActions">
            <Link href="/seguridad" className="primaryButton">
              Soy cliente <ArrowRight size={18} />
            </Link>
            <Link href="/registro" className="secondaryButton">
              <BriefcaseBusiness size={18} /> Soy profesional
            </Link>
          </div>
        </div>
      </section>

      <section className="securitySection">
        <div className="securitySectionInner">
          <QuickHelpAssistant />
          <div className="sectionHeading" style={{ marginTop: 28 }}>
            <div>
              <p className="kicker">ACCESOS RÁPIDOS</p>
              <h2>Ir directo a lo que necesitas</h2>
            </div>
          </div>
          <div className="helpQuickGrid">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href + label} href={href} className="helpQuickCard">
                <span className="helpQuickIcon">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="securitySection securitySectionAlt">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">PARA CLIENTES</p>
              <h2>Si necesitas un servicio</h2>
              <p className="muted">Desde el registro hasta el pago al aprobar.</p>
            </div>
          </div>
          <div className="helpFaqList">
            {CLIENT_HELP.map((item) => (
              <article key={item.q} className="helpFaqCard">
                <div className="helpFaqIcon">
                  <HandCoins size={20} />
                </div>
                <div>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                  <Link href={item.href} className="textLink">
                    {item.linkLabel} <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="securitySection">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">PARA PROFESIONALES</p>
              <h2>Si quieres trabajar con ZOVIT</h2>
              <p className="muted">Verificación, trabajos, cobro y certificado.</p>
            </div>
          </div>
          <div className="helpFaqList">
            {PRO_HELP.map((item) => (
              <article key={item.q} className="helpFaqCard">
                <div className="helpFaqIcon">
                  <BriefcaseBusiness size={20} />
                </div>
                <div>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                  <Link href={item.href} className="textLink">
                    {item.linkLabel} <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="securitySection securitySectionAlt">
        <div className="securitySectionInner">
          <div className="sectionHeading">
            <div>
              <p className="kicker">LEGAL Y SEGURIDAD</p>
              <h2>Documentos importantes</h2>
            </div>
          </div>
          <div className="helpLegalRow">
            <Link href="/legal/terminos" className="secondaryButton">
              Términos y condiciones
            </Link>
            <Link href="/legal/privacidad" className="secondaryButton">
              Privacidad
            </Link>
            <Link href="/legal/seguridad" className="secondaryButton">
              Seguridad
            </Link>
            <Link href="/legal/cookies" className="secondaryButton">
              Cookies
            </Link>
          </div>
        </div>
      </section>

      <section className="securitySection">
        <div className="securityCtaCard">
          <p className="kicker">¿LISTO PARA EMPEZAR?</p>
          <h2>Crea tu cuenta verificada</h2>
          <p>
            Si aún no tienes acceso, regístrate. Si ya tienes cuenta, ingresa a tu panel para
            continuar.
          </p>
          <div className="securityHeroActions">
            <Link href="/registro" className="primaryButton">
              Crear cuenta <ArrowRight size={18} />
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
