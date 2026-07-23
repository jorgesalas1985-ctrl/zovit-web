"use client";

import type { RecommendedProfessional } from "@/lib/ai/types";
import { ProfessionalTrustBadges } from "@/components/verification/ProfessionalTrustBadges";
import { ArrowRight, Clock3, MapPin, Star, UserRound } from "lucide-react";
import Link from "next/link";

type Props = {
  professional: RecommendedProfessional;
  referencePrice?: string;
  onRequest: (professionalId: string) => void;
  contactLabel?: string;
};

const badgeLabels = {
  junior: "Junior",
  verified: "Verificado",
  expert: "Experto",
} as const;

export function ProfessionalBrowseCard({ professional, referencePrice, onRequest, contactLabel = "Solicitar servicio" }: Props) {
  const availability =
    professional.matchScore >= 50 ? "Disponible para solicitudes" : "Consultar disponibilidad";

  return (
    <article className="browseProfessionalCard">
      <div className="browseProfessionalTop">
        <div className="browseProfessionalAvatar">
          <UserRound size={22} />
        </div>
        <div>
          <h3>
            {professional.firstName} {professional.lastName}
          </h3>
          <p className="browseProfessionalMeta">
            {professional.commune ? (
              <>
                <MapPin size={14} /> {professional.commune}
              </>
            ) : (
              "Comuna no informada"
            )}
          </p>
          <ProfessionalTrustBadges
            identityVerified={professional.identityVerified}
            biometricVerified={professional.biometricVerified}
          />
        </div>
        <span className={`experienceBadge experienceBadge-${professional.experienceLevel}`}>
          {badgeLabels[professional.experienceLevel]}
        </span>
      </div>

      <div className="browseProfessionalStats">
        <span>
          <Star size={15} /> {professional.averageRating.toFixed(1)} ({professional.ratingCount})
        </span>
        <span>Score ZOVIT {Math.round(professional.matchScore)}</span>
        <span>{professional.completedJobs} trabajos verificados</span>
        <span>
          <Clock3 size={14} /> {availability}
        </span>
      </div>

      {referencePrice && <p className="browseReferencePrice">{referencePrice}</p>}

      {professional.specialties.length > 0 && (
        <div className="aiTagRow">
          {professional.specialties.slice(0, 3).map((specialty) => (
            <span className="aiTag" key={specialty}>
              {specialty}
            </span>
          ))}
        </div>
      )}

      <div className="browseProfessionalActions">
        <Link href={`/profesional/${professional.id}`} className="secondaryButton">
          Ver perfil
        </Link>
        <button className="primaryButton" onClick={() => onRequest(professional.id)}>
          {contactLabel} <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
