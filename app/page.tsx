"use client";

import Link from "next/link";
import { ArrowRight, Bot, BriefcaseBusiness, LayoutGrid } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { HomeHeroStory } from "@/components/home/HomeHeroStory";
import { TrustPillars } from "@/components/home/TrustPillars";
import { IntranetFooterAccess } from "@/components/intranet/IntranetFooterAccess";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import {
  canPublishServiceRequest,
  getBrowseServicesHref,
  getRequestServiceHref,
} from "@/lib/auth/roles";

export default function HomePage() {
  const { user, profile } = useAuth();
  const isLoggedIn = Boolean(user);
  const canPublish = canPublishServiceRequest(profile);
  const requestHref = isLoggedIn
    ? canPublish
      ? getBrowseServicesHref(true)
      : "/panel"
    : getRequestServiceHref(false);
  const finalRequestHref = isLoggedIn
    ? canPublish
      ? getRequestServiceHref(true)
      : "/panel"
    : getRequestServiceHref(false);

  return (
    <main className="homeLanding">
      <section className="homeHero" aria-label="Inicio Zovit">
        <div className="homeHeroGrid">
          <div className="homeHeroCopy">
            <p className="homeHeroBrand">ZOVIT</p>
            <h1>
              Solicita un servicio. Recibe ofertas de profesionales verificados y paga sólo cuando el
              trabajo esté terminado y aprobado.
            </h1>
            <p className="homeHeroLead">
              Conectamos a quien necesita un servicio con profesionales que pueden hacerlo. El dinero
              solo se libera cuando tú apruebas el trabajo. Cliente y profesional se registran con la
              misma verificación de identidad.
            </p>
            <div className="homeHeroCtas">
              <Link href={requestHref} className="primaryButton homeHeroCtaPrimary">
                {isLoggedIn ? (
                  <>
                    Solicitar servicio <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Regístrate para solicitar <ArrowRight size={18} />
                  </>
                )}
              </Link>
              <Link href="/registro" className="whiteButton homeHeroCtaSecondary">
                <BriefcaseBusiness size={18} /> Quiero trabajar con Zovit
              </Link>
            </div>
          </div>

          <div className="homeHeroVisual">
            <HomeHeroStory />
          </div>
        </div>
      </section>

      <TrustPillars />

      <section className="contentSection homeCategories" id="explorar-servicios">
        <ScrollReveal>
          <div className="sectionHeading">
            <div>
              <p className="kicker">EXPLORAR SERVICIOS</p>
              <h2>¿Qué necesitas hoy?</h2>
              <p className="muted homeCategoriesLead">
                Elige cómo buscar. Para publicar una solicitud debes crear una cuenta verificada.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="searchMethodsGrid homeSearchMethods">
            <Link href="/ia" className="searchMethodCard searchMethodCardLink">
              <div className="searchMethodHead">
                <div className="searchMethodIcon ai">
                  <Bot size={22} />
                </div>
                <div>
                  <p className="kicker">Opción 1</p>
                  <h2>Buscar con IA</h2>
                </div>
              </div>
              <p className="muted">
                Describe el problema con tus palabras. ZOVIT sugiere la especialidad y profesionales.
              </p>
              <span className="primaryButton browsePrimaryLink">
                Buscar con IA <ArrowRight size={18} />
              </span>
            </Link>

            <Link href="/categorias" className="searchMethodCard searchMethodCardLink">
              <div className="searchMethodHead">
                <div className="searchMethodIcon manual">
                  <LayoutGrid size={22} />
                </div>
                <div>
                  <p className="kicker">Opción 2</p>
                  <h2>Búsqueda manual</h2>
                </div>
              </div>
              <p className="muted">
                Explora categorías, subcategorías y especialidades hasta encontrar el servicio.
              </p>
              <span className="secondaryButton browsePrimaryLink">
                Ir a categorías <ArrowRight size={18} />
              </span>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="homeFinalCta">
        <ScrollReveal>
          <div className="homeFinalCtaInner">
            <p className="homeFinalCtaBrand">ZOVIT</p>
            <h2>Confianza primero. Pago al final.</h2>
            <p>Regístrate, verifica tu identidad y solicita. El profesional cobra solo cuando apruebas.</p>
            <div className="homeFinalCtaActions">
              <Link href={finalRequestHref} className="whiteButton">
                {isLoggedIn && canPublish ? (
                  <>
                    Solicitar servicio <ArrowRight size={18} />
                  </>
                ) : isLoggedIn ? (
                  <>
                    Ir al panel <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Crear cuenta para solicitar <ArrowRight size={18} />
                  </>
                )}
              </Link>
              <Link href="/registro" className="homeFinalCtaGhost">
                Quiero trabajar con Zovit
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <IntranetFooterAccess />
      <SiteFooter />
    </main>
  );
}
