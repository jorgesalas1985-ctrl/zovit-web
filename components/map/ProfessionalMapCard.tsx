"use client";

import {
  availabilityLabel,
  availabilityTone,
  type MapProfessional,
} from "@/lib/map/types";
import { formatDistanceKm, formatEtaMinutes } from "@/lib/geo/distance";
import { BadgeCheck, Star, X } from "lucide-react";

type ProfessionalMapCardProps = {
  professional: MapProfessional;
  onClose: () => void;
  onRequest: () => void;
  variant?: "panel" | "sheet";
};

export function ProfessionalMapCard({
  professional,
  onClose,
  onRequest,
  variant = "panel",
}: ProfessionalMapCardProps) {
  const tone = availabilityTone(professional.availabilityStatus);
  const specialty =
    professional.specialties[0] ||
    professional.serviceCategories[0] ||
    "Servicios generales";

  return (
    <article className={`mapProCard mapProCard-${variant}`} aria-label={`Profesional ${professional.displayName}`}>
      <button type="button" className="mapProClose" onClick={onClose} aria-label="Cerrar detalle">
        <X size={16} />
      </button>

      <div className="mapProHeader">
        <div className={`mapProAvatar mapTone-${tone}`}>
          {professional.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={professional.avatarUrl} alt="" />
          ) : (
            <span>{professional.firstName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h3>{professional.displayName}</h3>
          <p className="muted">{specialty}</p>
          <span className={`mapAvailPill mapTone-${tone}`}>{availabilityLabel(professional.availabilityStatus)}</span>
        </div>
      </div>

      <ul className="mapProMeta">
        {professional.averageRating > 0 && (
          <li>
            <Star size={14} aria-hidden />
            {professional.averageRating.toFixed(1)}
            {professional.ratingCount > 0 ? ` (${professional.ratingCount})` : ""}
          </li>
        )}
        <li>{professional.completedJobs} trabajos</li>
        <li>{formatDistanceKm(professional.distanceKm)}</li>
        <li>ETA ~ {formatEtaMinutes(professional.etaMinutes)}</li>
      </ul>

      {(professional.identityVerified || professional.biometricVerified || professional.certified) && (
        <div className="mapProBadges">
          {(professional.identityVerified || professional.biometricVerified) && (
            <span>
              <BadgeCheck size={14} aria-hidden /> Verificado
            </span>
          )}
          {professional.certified && <span>Certificado</span>}
        </div>
      )}

      {professional.serviceCategories.length > 0 && (
        <div className="mapChipRow mapChipRowCompact">
          {professional.serviceCategories.slice(0, 4).map((cat) => (
            <span key={cat} className="mapChip isStatic">
              {cat}
            </span>
          ))}
        </div>
      )}

      <button type="button" className="primaryButton wide" onClick={onRequest}>
        Solicitar servicio
      </button>
    </article>
  );
}

export function ProfessionalBottomSheet(props: ProfessionalMapCardProps) {
  return (
    <div className="mapBottomSheet" role="dialog" aria-modal="true" aria-label="Detalle del profesional">
      <div className="mapBottomSheetHandle" aria-hidden />
      <ProfessionalMapCard {...props} variant="sheet" />
    </div>
  );
}
