"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bot, BriefcaseBusiness, FileBadge2, LayoutGrid, MapPinned, CalendarDays, MapPin, Building2, Globe, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { HomeHeroStory } from "@/components/home/HomeHeroStory";
import { TrustPillars } from "@/components/home/TrustPillars";
import { IntranetFooterAccess } from "@/components/intranet/IntranetFooterAccess";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import {
  canPublishServiceRequest,
  getRequestServiceHref,
} from "@/lib/auth/roles";
import { useState, useEffect } from "react";

const comunasLanzamiento = [
  "Santiago", "Providencia", "Las Condes", "Ñuñoa", "La Florida",
  "Maipú", "Puente Alto", "San Bernardo", "Vitacura", "Lo Barnechea"
];

export default function HomePage() {
  const { user, profile } = useAuth();
  const isLoggedIn = Boolean(user);
  const canPublish = canPublishServiceRequest(profile);
  const mapHref = isLoggedIn ? (canPublish ? "/cliente/mapa" : "/panel") : "/seguridad";
  const finalRequestHref = isLoggedIn
    ? canPublish
      ? getRequestServiceHref(true)
      : "/panel"
    : getRequestServiceHref(false);

  const [showBanner, setShowBanner] = useState(true);
  const [diasRestantes, setDiasRestantes] = useState(0);

  useEffect(() => {
    const fechaLanzamiento = new Date("2026-10-01T00:00:00-04:00");
    const hoy = new Date();
    const diff = Math.max(0, Math.ceil((fechaLanzamiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)));
    setDiasRestantes(diff);
  }, []);

  return (
    <main className="homeLanding">
      {/* === BANNER FLOTANTE DE LANZAMIENTO === */}
      {showBanner && (
        <div className="launchBanner">
          <div className="launchBannerInner">
            <div className="launchBannerContent">
              <div className="launchBannerIcon">
                <CalendarDays size={22} />
              </div>
              <div className="launchBannerText">
                <strong>🚀 ZOVIT llega a Chile el 1 de octubre 2026</strong>
                <span>
                  Lanzamiento en 10 comunas de la Región Metropolitana.
                  {diasRestantes > 0 && ` Faltan ${diasRestantes} días.`}
                </span>
              </div>
            </div>
            <div className="launchBannerActions">
              <span className="launchComunas">
                <MapPin size={14} />
                {comunasLanzamiento.slice(0, 3).join(", ")} y {comunasLanzamiento.length - 3} más
              </span>
              <button className="launchBannerClose" onClick={() => setShowBanner(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === TEXTO FLOTANTE: SOLO PROFESIONALES === */}
      <div className="floatingNotice">
        <div className="floatingNoticeInner">
          <Users size={16} />
          <span>
            <strong>Registro exclusivo para profesionales.</strong> Los clientes podrán crear su cuenta a partir del <strong>1 de octubre 2026</strong>.
          </span>
        </div>
      </div>
      <section className="homeHero" aria-label="Inicio Zovit">
        <div className="homeHeroGrid">
          <div className="homeHeroCopy">
            <p className="homeHeroBrand">ZOVIT</p>
            <h1>
              Solicita un servicio. Recibe ofertas de profesionales verificados y paga sólo cuando el
              trabajo esté terminado y aprobado.
            </h1>
            <p className="homeHeroLead">
              Conectamos a quien necesita un servicio con profesionales que pueden hacerlo. Busca cerca
              de ti en el mapa, el dinero solo se libera cuando tú apruebas el trabajo.
            </p>
            <div className="homeHeroCtas">
              <Link href={mapHref} className="primaryButton homeHeroCtaPrimary">
                {isLoggedIn && canPublish ? (
                  <>
                    Ver mapa cerca de ti <ArrowRight size={18} />
                  </>
                ) : isLoggedIn ? (
                  <>
                    Ir al panel <ArrowRight size={18} />
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
          <div className="searchMethodsGrid homeSearchMethods homeSearchMethods--three">
            <Link href={mapHref} className="searchMethodCard searchMethodCardLink searchMethodCard--map">
              <div className="searchMethodMedia" aria-hidden>
                <Image
                  src="/home/search-map-card.png"
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 360px"
                  className="searchMethodMediaImg"
                />
              </div>
              <div className="searchMethodHead">
                <div className="searchMethodIcon map">
                  <MapPinned size={22} />
                </div>
                <div>
                  <p className="kicker">Opción 1</p>
                  <h2>Buscar en el mapa</h2>
                </div>
              </div>
              <p className="muted">
                Mira profesionales cerca de ti, filtra por oficio y solicita con ubicación en vivo.
              </p>
              <span className="primaryButton browsePrimaryLink">
                Abrir mapa <ArrowRight size={18} />
              </span>
            </Link>

            <Link href="/ia" className="searchMethodCard searchMethodCardLink">
              <div className="searchMethodHead">
                <div className="searchMethodIcon ai">
                  <Bot size={22} />
                </div>
                <div>
                  <p className="kicker">Opción 2</p>
                  <h2>Buscar con IA</h2>
                </div>
              </div>
              <p className="muted">
                Describe el problema con tus palabras. ZOVIT sugiere la especialidad y profesionales.
              </p>
              <span className="secondaryButton browsePrimaryLink">
                Buscar con IA <ArrowRight size={18} />
              </span>
            </Link>

            <Link href="/categorias" className="searchMethodCard searchMethodCardLink">
              <div className="searchMethodHead">
                <div className="searchMethodIcon manual">
                  <LayoutGrid size={22} />
                </div>
                <div>
                  <p className="kicker">Opción 3</p>
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

        <ScrollReveal>
          <div className="homeCertificateCta">
            <div>
              <p className="kicker">EXPERIENCIA VERIFICABLE</p>
              <h3>Certificado de experiencia laboral</h3>
              <p className="muted">
                Genera o verifica un certificado ZOVIT con identidad y trayectoria comprobables.
              </p>
            </div>
            <Link href="/certificado-experiencia" className="primaryButton">
              <FileBadge2 size={18} /> Crear certificado de experiencia laboral
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
