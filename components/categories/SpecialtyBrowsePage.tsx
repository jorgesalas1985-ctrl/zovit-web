"use client";

import { CategoryBreadcrumbs } from "@/components/categories/CategoryBreadcrumbs";
import { InstitutionLegalNotice } from "@/components/categories/InstitutionLegalNotice";
import { ProfessionalBrowseCard } from "@/components/services/ProfessionalBrowseCard";
import { ServiceBrowseShell } from "@/components/services/ServiceBrowseShell";
import { ServiceFilters } from "@/components/services/ServiceFilters";
import { useAuth } from "@/components/AuthProvider";
import { canPublishServiceRequest, shouldShowPublishUI } from "@/lib/auth/roles";
import type { RecommendedProfessional } from "@/lib/ai/types";
import {
  getBreadcrumbSegments,
  getSearchParamsForLeaf,
  shouldShowLegalNotice,
  type ResolvedCategoryPath,
} from "@/lib/categories/hierarchy";
import {
  buildManualDescription,
  saveManualSelection,
  type ManualServiceSelection,
} from "@/lib/services/manualSelection";
import { getCategoryIconByKey } from "@/lib/services/icons";
import { Bell, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  resolved: ResolvedCategoryPath;
};

export function SpecialtyBrowsePage({ resolved }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const searchParams = getSearchParamsForLeaf(resolved);
  const breadcrumbs = getBreadcrumbSegments(resolved);
  const Icon = getCategoryIconByKey(
    resolved.leaf.icon ?? resolved.nodes.at(-2)?.icon ?? resolved.root.icon,
  );

  const [commune, setCommune] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<"match" | "rating" | "jobs">("match");
  const [modality, setModality] = useState<"all" | "presential" | "remote">("all");
  const [professionals, setProfessionals] = useState<RecommendedProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");

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
            category: searchParams.category,
            specialty: searchParams.specialty,
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
  }, [commune, minRating, searchParams.category, searchParams.specialty]);

  const sortedProfessionals = useMemo(() => {
    let copy = [...professionals];

    if (modality === "presential") {
      copy = copy.filter((professional) => Boolean(professional.commune));
    } else if (modality === "remote") {
      copy = copy.filter((professional) => !professional.commune);
    }

    if (sortBy === "rating") {
      return copy.sort((a, b) => b.averageRating - a.averageRating);
    }
    if (sortBy === "jobs") {
      return copy.sort((a, b) => b.completedJobs - a.completedJobs);
    }
    return copy.sort((a, b) => b.matchScore - a.matchScore);
  }, [modality, professionals, sortBy]);

  const startRequest = (professionalId?: string) => {
    const selection: ManualServiceSelection = {
      source: "manual",
      category: searchParams.category,
      categorySlug: resolved.root.slug,
      subcategory: resolved.leaf.name,
      subcategorySlug: resolved.leaf.slug,
      specialty: searchParams.specialty,
      description: buildManualDescription(searchParams.specialty, searchParams.category),
      referencePrice: searchParams.referencePrice,
      professionalId,
      commune: commune.trim() || undefined,
    };

    saveManualSelection(selection);

    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/solicitudes/nueva")}`);
      return;
    }

    if (profile && !canPublishServiceRequest(profile)) {
      router.push("/trabajos");
      return;
    }

    router.push("/solicitudes/nueva");
  };

  const canPublish = shouldShowPublishUI(profile, Boolean(user));

  function notifyWhenAvailable() {
    const key = `zovit-notify:${resolved.nodes.map((node) => node.slug).join("/")}`;
    localStorage.setItem(key, new Date().toISOString());
    setNotifyMessage("Te avisaremos cuando haya profesionales disponibles en esta especialidad.");
  }

  return (
    <ServiceBrowseShell
      title={`Profesionales para ${resolved.leaf.name.toLowerCase()}`}
      description="Encuentra profesionales con experiencia relacionada y perfiles verificados en ZOVIT."
      kicker={resolved.root.name.toUpperCase()}
      breadcrumbs={<CategoryBreadcrumbs segments={breadcrumbs} />}
    >
      {shouldShowLegalNotice(resolved) && <InstitutionLegalNotice />}

      <div className="browseDetailHero">
        <div className="browseIntroCard">
          <div className="browseCardIcon">
            <Icon size={22} />
          </div>
          <div>
            <h2>{resolved.leaf.name}</h2>
            <p>{resolved.leaf.description}</p>
          </div>
        </div>

        <div className="browseDetailMeta">
          <span>
            <Star size={15} /> Identidad verificada en ZOVIT
          </span>
          <span>
            <MapPin size={15} /> Filtra por ubicación
          </span>
          <span>ZOVIT Score por coincidencia y experiencia</span>
        </div>
      </div>

      <ServiceFilters
        commune={commune}
        minRating={minRating}
        sortBy={sortBy}
        modality={modality}
        onCommuneChange={setCommune}
        onMinRatingChange={setMinRating}
        onSortByChange={setSortBy}
        onModalityChange={setModality}
      />

      <div className="browseSectionHeading">
        <h2>Profesionales disponibles</h2>
      </div>

      {loading && <p className="muted">Cargando profesionales…</p>}
      {error && <p className="aiError">{error}</p>}

      {!loading && sortedProfessionals.length === 0 && (
        <div className="categoryEmptyState">
          <p>No hay profesionales disponibles actualmente en esta especialidad.</p>
          <button type="button" className="secondaryButton wide" onClick={notifyWhenAvailable}>
            <Bell size={16} /> Avísame cuando haya profesionales
          </button>
          {notifyMessage && <p className="notice">{notifyMessage}</p>}
        </div>
      )}

      <div className="browseProfessionalGrid">
        {sortedProfessionals.map((professional) => (
          <ProfessionalBrowseCard
            key={professional.id}
            professional={professional}
            referencePrice={searchParams.referencePrice}
            onRequest={canPublish ? startRequest : undefined}
            showRequestButton={canPublish}
            contactLabel="Contactar"
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
