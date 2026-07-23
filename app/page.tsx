"use client";

import { CategoryPickerDropdown } from "@/components/categories/CategoryPickerDropdown";
import { ClickableServiceCard } from "@/components/services/ClickableServiceCard";
import { IntranetFooterAccess } from "@/components/intranet/IntranetFooterAccess";
import { getCategoryLeafCount, getFeaturedCategories } from "@/lib/services/catalog";
import { getCategoryIcon } from "@/lib/services/icons";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const featuredCategories = getFeaturedCategories(5);

export default function HomePage() {
  const router = useRouter();
  const [need, setNeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = () => {
    const q = need.trim();
    if (!q) {
      setError("Describe tu problema antes de buscar.");
      return;
    }
    if (q.length < 8) {
      setError("Escribe al menos 8 caracteres para que la IA pueda analizar tu consulta.");
      return;
    }

    setLoading(true);
    setError("");
    router.push(`/ia/resultados?q=${encodeURIComponent(q)}`);
  };

  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={16} /> Encuentra profesionales en ZOVIT</div>
        <h1>Encuentra ayuda confiable, <span>sin perder tiempo.</span></h1>
        <p className="heroText">
          Elige cómo quieres buscar: describe tu problema con IA o navega manualmente por categorías y subcategorías.
        </p>

        <div className="searchMethodsGrid">
          <article className="searchMethodCard">
            <div className="searchMethodHead">
              <div className="searchMethodIcon ai">
                <Bot size={22} />
              </div>
              <div>
                <p className="kicker">OPCIÓN 1</p>
                <h2>Encontrar profesional con IA</h2>
              </div>
            </div>
            <p className="muted">
              Describe lo que necesitas. ZOVIT interpreta el problema, sugiere categoría, subcategoría y profesionales conectados.
            </p>

            <form
              className="aiSearch aiSearchCompact"
              onSubmit={(event) => {
                event.preventDefault();
                search();
              }}
            >
              <textarea
                value={need}
                onChange={(e) => {
                  setNeed(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Ejemplo: mi auto no enciende, se apagaron las luces de repente…"
                aria-label="Describe tu problema para buscar con IA"
                minLength={8}
              />
              <button type="submit" className="primaryButton" disabled={loading}>
                {loading ? "Redirigiendo…" : <>Buscar con IA <ArrowRight size={18} /></>}
              </button>
            </form>

            {error && <p className="aiError">{error}</p>}
          </article>

          <article className="searchMethodCard">
            <div className="searchMethodHead">
              <div className="searchMethodIcon manual">
                <LayoutGrid size={22} />
              </div>
              <div>
                <p className="kicker">OPCIÓN 2</p>
                <h2>Elegir categoría manualmente</h2>
              </div>
            </div>
            <p className="muted">
              Explora categorías, subcategorías, filtros y profesionales disponibles sin escribir una descripción.
            </p>
            <CategoryPickerDropdown />
          </article>
        </div>

        <div className="trustRow">
          <span><BadgeCheck size={19} /> Profesionales verificados</span>
          <span><ShieldCheck size={19} /> Solicitudes protegidas</span>
          <span><Sparkles size={19} /> IA + navegación manual</span>
        </div>
      </section>

      <section className="contentSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">ACCESO RÁPIDO</p>
            <h2>Categorías principales</h2>
          </div>
          <Link href="/categorias" className="textLink">
            Ver todas las categorías <ArrowRight size={17} />
          </Link>
        </div>

        <div className="browseGrid browseGridHome">
          {featuredCategories.map((category) => {
            const Icon = getCategoryIcon(category.name);
            return (
              <ClickableServiceCard
                key={category.slug}
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
            );
          })}
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

      <IntranetFooterAccess />
    </main>
  );
}
