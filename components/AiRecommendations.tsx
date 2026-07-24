"use client";

import type { AiRecommendResponse } from "@/lib/ai/types";
import { ProfessionalTrustBadges } from "@/components/verification/ProfessionalTrustBadges";
import { ArrowRight, Bot, MapPin, Star, UserRound } from "lucide-react";
import Link from "next/link";

type Props = {
  result: AiRecommendResponse;
  onCreateRequest: () => void;
  canPublish?: boolean;
};

const badgeLabels = {
  junior: "Junior",
  verified: "Verificado",
  expert: "Experto",
} as const;

export function AiRecommendations({ result, onCreateRequest, canPublish = true }: Props) {
  const { parsed, professionals } = result;

  return (
    <section className="aiResults">
      <div className="aiResultsHeader">
        <div className="aiResultsBadge">
          <Bot size={20} />
        </div>
        <div>
          <p className="kicker">ANÁLISIS ZOVIT IA</p>
          <h2>{parsed.specialty}</h2>
          <p className="muted">{parsed.explanation}</p>
          <div className="aiMetaRow">
            <span>Categoría: {parsed.category}</span>
            <span>Confianza: {Math.round(parsed.confidence * 100)}%</span>
          </div>
        </div>
      </div>

      {professionals.length > 0 ? (
        <div className="aiProfessionalGrid">
          {professionals.map((professional) => (
            <article className="aiProfessionalCard" key={professional.id}>
              <div className="aiProfessionalTop">
                <div className="aiProfessionalAvatar">
                  <UserRound size={22} />
                </div>
                <div>
                  <h3>
                    {professional.firstName} {professional.lastName}
                  </h3>
                  {professional.commune && (
                    <p className="aiProfessionalCommune">
                      <MapPin size={14} /> {professional.commune}
                    </p>
                  )}
                  <ProfessionalTrustBadges
                    identityVerified={professional.identityVerified}
                    biometricVerified={professional.biometricVerified}
                  />
                </div>
                <span className={`experienceBadge experienceBadge-${professional.experienceLevel}`}>
                  {badgeLabels[professional.experienceLevel]}
                </span>
              </div>

              <div className="aiProfessionalStats">
                <span>
                  <Star size={15} /> {professional.averageRating.toFixed(1)} ({professional.ratingCount})
                </span>
                <span>{professional.completedJobs} trabajos verificados</span>
                <span>Match {professional.matchScore}%</span>
              </div>

              {professional.specialties.length > 0 && (
                <div className="aiTagRow">
                  {professional.specialties.slice(0, 3).map((specialty) => (
                    <span className="aiTag" key={specialty}>
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              <Link href={`/profesional/${professional.id}`} className="secondaryButton wide">
                Ver perfil <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="aiEmptyState">
          <p>
            Aún no hay un profesional conectado exactamente para este caso, pero puedes publicar la
            solicitud y el primero disponible te contactará.
          </p>
        </div>
      )}

      <div className="aiResultsActions">
        {canPublish ? (
          <button className="primaryButton" onClick={onCreateRequest}>
            Publicar solicitud con esta especialidad <ArrowRight size={18} />
          </button>
        ) : (
          <Link href="/trabajos" className="primaryButton">
            Ver trabajos disponibles <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </section>
  );
}
