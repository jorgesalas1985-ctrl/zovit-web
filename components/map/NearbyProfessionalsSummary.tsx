"use client";

import { formatEtaMinutes } from "@/lib/geo/distance";
import { Users } from "lucide-react";

export function NearbyProfessionalsSummary({
  count,
  averageEtaMinutes,
  loading,
}: {
  count: number;
  averageEtaMinutes: number | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mapSummary" aria-live="polite">
        <Users size={16} aria-hidden />
        Buscando profesionales cerca de ti…
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mapSummary mapSummaryEmpty" aria-live="polite">
        No encontramos profesionales disponibles en este radio. Prueba ampliando la distancia.
      </div>
    );
  }

  return (
    <div className="mapSummary" aria-live="polite">
      <Users size={16} aria-hidden />
      <div>
        <strong>
          Hay {count} profesional{count === 1 ? "" : "es"} disponible
          {count === 1 ? "" : "s"} cerca de ti
        </strong>
        {averageEtaMinutes != null && (
          <p>Tiempo promedio estimado de llegada: {formatEtaMinutes(averageEtaMinutes)}</p>
        )}
      </div>
    </div>
  );
}
