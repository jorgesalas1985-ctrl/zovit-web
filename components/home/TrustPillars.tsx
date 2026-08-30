"use client";

import { ScrollReveal } from "@/components/home/ScrollReveal";
import { BadgeCheck, Lock, Smartphone } from "lucide-react";
import Image from "next/image";

const PILLARS = [
  {
    icon: BadgeCheck,
    image: "/home/story-pro-nearby.png",
    badge: "Identidad comprobada",
    title: "Profesionales verificados",
    description: "Identidad revisada antes de conectar. Tú eliges a quién confiar el trabajo.",
  },
  {
    icon: Lock,
    image: "/home/search-map-card.png",
    badge: "Dinero protegido",
    title: "Pago protegido",
    description: "Tu dinero queda resguardado. Solo se libera cuando apruebas el trabajo terminado.",
  },
  {
    icon: Smartphone,
    image: "/home/story-map-search.png",
    badge: "Seguimiento en vivo",
    title: "Todo desde una sola app",
    description: "Solicita, recibe ofertas, sigue el avance y libera el pago sin salir de Zovit.",
  },
] as const;

export function TrustPillars() {
  return (
    <section className="homeTrust" id="confianza" aria-label="Por qué confiar en Zovit">
      <div className="homeTrustInner">
        {PILLARS.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <ScrollReveal key={pillar.title} delay={index * 90} className="homeTrustCardWrap">
              <article className="homeTrustCard">
                <div className={`homeTrustMedia homeTrustMedia--${index + 1}`} aria-hidden="true">
                  <Image
                    src={pillar.image}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 900px) 100vw, 360px"
                    className="homeTrustImage"
                  />
                  <span className="homeTrustMediaGlow" />
                  <span className="homeTrustMediaBadge">
                    <Icon size={16} /> {pillar.badge}
                  </span>
                  <span className="homeTrustPulse homeTrustPulse--one" />
                  <span className="homeTrustPulse homeTrustPulse--two" />
                </div>
                <div className="homeTrustIcon">
                  <Icon size={22} strokeWidth={2.1} />
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
