"use client";

import { ScrollReveal } from "@/components/home/ScrollReveal";
import { BadgeCheck, Lock, Smartphone } from "lucide-react";

const PILLARS = [
  {
    icon: BadgeCheck,
    title: "Profesionales verificados",
    description: "Identidad revisada antes de conectar. Tú eliges a quién confiar el trabajo.",
  },
  {
    icon: Lock,
    title: "Pago protegido",
    description: "Tu dinero queda resguardado. Solo se libera cuando apruebas el trabajo terminado.",
  },
  {
    icon: Smartphone,
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
