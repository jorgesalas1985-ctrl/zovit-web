"use client";

import { ProfessionalBrowseCard } from "@/components/services/ProfessionalBrowseCard";
import { ServiceBrowseShell } from "@/components/services/ServiceBrowseShell";
import { ServiceFilters } from "@/components/services/ServiceFilters";
import { useAuth } from "@/components/AuthProvider";
import type { RecommendedProfessional } from "@/lib/ai/types";
import type { CategoryBrowseDefinition, SubcategoryDefinition } from "@/lib/services/catalog";
import {
  buildManualDescription,
  saveManualSelection,
  type ManualServiceSelection,
} from "@/lib/services/manualSelection";
import { getCategoryIcon } from "@/lib/services/icons";
import { ArrowRight, Clock3, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  category: CategoryBrowseDefinition;
  subcategory: SubcategoryDefinition;
};

export function SubcategoryBrowsePage({ category, subcategory }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const Icon = getCategoryIcon(category.name);

  const [commune, setCommune] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<"match" | "rating" | "jobs">("match");
  const [professionals, setProfessionals] = useState<RecommendedProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfessionals() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/services/professionals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: category.name,
            specialty: subcategory.label,
            commune,
            minRating,
          }),
        });

        const data = (await response.json()) as {
          professionals?: RecommendedProfessional[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudieron cargar profesionales.");
        }

        if (!cancelled) {
          setProfessionals(data.professionals ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
          setProfessionals([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = window.setTimeout(loadProfessionals, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [category.name, commune, minRating, subcategory.label]);

  const sortedProfessionals = useMemo(() => {
    const copy = [...professionals];
    if (sortBy === "rating") {
      return copy.sort((a, b) => b.averageRating - a.averageRating);
    }
    if (sortBy === "jobs") {
      return copy.sort((a, b) => b.completedJobs - a.completedJobs);
    }
    return copy.sort((a, b) => b.matchScore - a.matchScore);
  }, [professionals, sortBy]);

  const startRequest = (professionalId?: string) => {
    const selection: ManualServiceSelection = {
      source: "manual",
      category: category.name,
      categorySlug: category.slug,
      subcategory: subcategory.label,
      subcategorySlug: subcategory.slug,
      specialty: subcategory.label,
      description: buildManualDescription(subcategory.label, category.name),
      referencePrice: subcategory.referencePrice,
      professionalId,
      commune: commune.trim() || undefined,
    };

    saveManualSelection(selection);

    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/solicitudes/nueva")}`);
      return;
    }

    router.push("/solicitudes/nueva");
  };

  return (
    <ServiceBrowseShell
      title={subcategory.label}
      description={subcategory.description}
      backHref={`/servicios/${category.slug}`}
      backLabel={`Volver a ${category.name}`}
      kicker={category.name.toUpperCase()}
    >
      <div className="browseDetailHero">
        <div className="browseIntroCard">
          <div className="browseCardIcon">
            <Icon size={22} />
          </div>
          <div>
            <h2>{subcategory.label}</h2>
            <p>{subcategory.description}</p>
          </div>
        </div>

        <div className="browseDetailMeta">
          <span>
            <Star size={15} /> Servicio verificable en ZOVIT
          </span>
          <span>
            <MapPin size={15} /> Filtra por comuna
          </span>
          <span>
            <Clock3 size={15} /> {subcategory.availability}
          </span>
        </div>

        <div className="browseReferenceBox">
          <strong>Precio referencial</strong>
          <p>{subcategory.referencePrice}</p>
        </div>
      </div>

      <ServiceFilters
        commune={commune}
        minRating={minRating}
        sortBy={sortBy}
        onCommuneChange={setCommune}
        onMinRatingChange={setMinRating}
        onSortByChange={setSortBy}
      />

      <div className="browseSectionHeading">
        <h2>Profesionales disponibles</h2>
        <button className="primaryButton" onClick={() => startRequest()}>
          Solicitar sin elegir profesional <ArrowRight size={16} />
        </button>
      </div>

      {loading && <p className="muted">Cargando profesionales…</p>}
      {error && <p className="aiError">{error}</p>}

      {!loading && sortedProfessionals.length === 0 && (
        <div className="aiEmptyState">
          <p>
            No hay profesionales conectados exactamente para esta subcategoría ahora, pero puedes
            publicar la solicitud manualmente y el primero disponible te contactará.
          </p>
          <button className="primaryButton" onClick={() => startRequest()}>
            Publicar solicitud <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="browseProfessionalGrid">
        {sortedProfessionals.map((professional) => (
          <ProfessionalBrowseCard
            key={professional.id}
            professional={professional}
            referencePrice={subcategory.referencePrice}
            onRequest={startRequest}
          />
        ))}
      </div>

      <p className="browseFooterNote">
        ¿Prefieres describir el problema con tus palabras?{" "}
        <Link href="/" className="textLink">
          Usa la búsqueda con IA
        </Link>
      </p>
    </ServiceBrowseShell>
  );
}
