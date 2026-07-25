"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { HomeHeroStory } from "@/components/home/HomeHeroStory";
import { TrustPillars } from "@/components/home/TrustPillars";
import { ClickableServiceCard } from "@/components/services/ClickableServiceCard";
import { IntranetFooterAccess } from "@/components/intranet/IntranetFooterAccess";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { getCategoryLeafCount, getFeaturedCategories } from "@/lib/services/catalog";
import { getCategoryIcon } from "@/lib/services/icons";

const featuredCategories = getFeaturedCategories(5);

export default function HomePage() {
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
              solo se libera cuando tú apruebas el trabajo.
            </p>
            <div className="homeHeroCtas">
              <Link href="/categorias" className="primaryButton homeHeroCtaPrimary">
                Solicitar servicio <ArrowRight size={18} />
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

      <section className="contentSection homeCategories">
        <ScrollReveal>
          <div className="sectionHeading">
            <div>
              <p className="kicker">EXPLORAR SERVICIOS</p>
              <h2>¿Qué necesitas hoy?</h2>
              <p className="muted homeCategoriesLead">
                Elige una categoría, publica tu necesidad y recibe ofertas de profesionales
                verificados.
              </p>
            </div>
            <Link href="/categorias" className="textLink">
              Ver todas <ArrowRight size={17} />
            </Link>
          </div>
        </ScrollReveal>

        <div className="browseGrid browseGridHome">
          {featuredCategories.map((category, index) => {
            const Icon = getCategoryIcon(category.name);
            return (
              <ScrollReveal key={category.slug} delay={index * 70}>
                <ClickableServiceCard
                  href={`/categorias/${category.slug}`}
                  title={category.name}
                  description={category.summary}
                  icon={Icon}
                  meta={
                    <span className="browseCardMeta">
                      {getCategoryLeafCount(category.slug)} especialidades
                    </span>
                  }
                />
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <section className="homeFinalCta">
        <ScrollReveal>
          <div className="homeFinalCtaInner">
            <p className="homeFinalCtaBrand">ZOVIT</p>
            <h2>Confianza primero. Pago al final.</h2>
            <p>Solicita hoy. El profesional cobra solo cuando el trabajo esté aprobado.</p>
            <div className="homeFinalCtaActions">
              <Link href="/categorias" className="whiteButton">
                Solicitar servicio <ArrowRight size={18} />
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
