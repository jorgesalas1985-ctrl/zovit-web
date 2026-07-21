"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, Car, Hammer, Home, Laptop, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const categories = [
  { title: "Hogar", icon: Home, text: "Electricidad, gasfitería y reparaciones." },
  { title: "Automotriz", icon: Car, text: "Diagnóstico, mecánica y electricidad." },
  { title: "Construcción", icon: Hammer, text: "Obras, terminaciones y mantención." },
  { title: "Tecnología", icon: Laptop, text: "Soporte, redes y soluciones digitales." },
  { title: "Servicios técnicos", icon: Wrench, text: "Especialistas verificados cerca de ti." }
];

export default function HomePage() {
  const router = useRouter();
  const [need, setNeed] = useState("");

  const search = () => {
    const q = need.trim();
    if (!q) return;
    sessionStorage.setItem("zovit_pending_request", q);
    router.push("/solicitudes/nueva");
  };

  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={16} /> Inteligencia artificial ZOVIT</div>
        <h1>Encuentra ayuda confiable, <span>sin perder tiempo.</span></h1>
        <p className="heroText">
          Describe lo que necesitas. ZOVIT identifica la especialidad correcta y te permite enviar una solicitud real desde tu cuenta.
        </p>

        <div className="aiSearch">
          <div className="aiBadge"><Bot size={25} /></div>
          <textarea
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="Ejemplo: mi calefont no enciende y necesito revisión hoy…"
          />
          <button className="primaryButton" onClick={search}>
            Buscar con IA <ArrowRight size={18} />
          </button>
        </div>

        <div className="trustRow">
          <span><BadgeCheck size={19} /> Profesionales verificados</span>
          <span><ShieldCheck size={19} /> Solicitudes protegidas</span>
          <span><Sparkles size={19} /> Experiencia personalizada</span>
        </div>
      </section>

      <section className="contentSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">SERVICIOS</p>
            <h2>Todo lo que necesitas, en un solo lugar.</h2>
          </div>
          <Link href="/registro" className="textLink">Trabaja con ZOVIT <ArrowRight size={17} /></Link>
        </div>

        <div className="categoryGrid">
          {categories.map(({ title, icon: Icon, text }) => (
            <article className="categoryCard" key={title}>
              <div className="categoryIcon"><Icon /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ctaSection">
        <div>
          <p className="kicker light">CUENTA REAL</p>
          <h2>Regístrate y guarda tus solicitudes en ZOVIT.</h2>
          <p>Tu sesión, perfil y solicitudes quedan conectados con Supabase.</p>
        </div>
        <Link href="/registro" className="whiteButton">Crear mi cuenta <ArrowRight size={18} /></Link>
      </section>
    </main>
  );
}
