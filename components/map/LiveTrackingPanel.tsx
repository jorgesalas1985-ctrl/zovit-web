"use client";

import Link from "next/link";
import { formatDistanceKm, formatEtaMinutes } from "@/lib/geo/distance";
import { AlertTriangle, LifeBuoy, MessageCircle, XCircle } from "lucide-react";

const STATUS_STEPS = [
  { key: "publicada", label: "Publicada" },
  { key: "aceptada", label: "Aceptada" },
  { key: "en_camino", label: "En camino" },
  { key: "en_ejecucion", label: "En ejecución" },
  { key: "finalizada", label: "Finalizada" },
] as const;

export function ServiceStatusTimeline({ status }: { status: string }) {
  const activeIndex = Math.max(
    0,
    STATUS_STEPS.findIndex((s) => s.key === status)
  );

  return (
    <ol className="mapStatusTimeline" aria-label="Estado del servicio">
      {STATUS_STEPS.map((step, index) => {
        const done = index <= activeIndex && status !== "cancelada";
        return (
          <li key={step.key} className={done ? "isDone" : ""}>
            <span className="mapStatusDot" aria-hidden />
            <span>{step.label}</span>
          </li>
        );
      })}
      {status === "cancelada" && <li className="isDanger">Cancelada</li>}
    </ol>
  );
}

type LiveTrackingPanelProps = {
  requestId: string;
  status: string;
  professionalName?: string;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  arrivalSuggested?: boolean;
  onClose?: () => void;
};

export function LiveTrackingPanel({
  requestId,
  status,
  professionalName,
  etaMinutes,
  distanceKm,
  arrivalSuggested,
  onClose,
}: LiveTrackingPanelProps) {
  const waitingAcceptance = status === "publicada";
  const title = waitingAcceptance
    ? "Esperando aceptación"
    : professionalName || "Profesional asignado";

  return (
    <aside className="mapLivePanel" aria-live="polite">
      <div className="mapLiveHead">
        <div>
          <p className="kicker">{waitingAcceptance ? "SOLICITUD" : "SEGUIMIENTO EN VIVO"}</p>
          <h3>{title}</h3>
        </div>
        {onClose && (
          <button type="button" className="mapIconGhost" onClick={onClose} aria-label="Cerrar seguimiento">
            ×
          </button>
        )}
      </div>

      <ServiceStatusTimeline status={status} />

      {waitingAcceptance ? (
        <p className="fieldHint">
          Tu solicitud ya está publicada. Cuando un profesional la acepte, verás su ubicación en vivo aquí.
        </p>
      ) : (
        <div className="mapLiveStats">
          {etaMinutes != null && <span>ETA ~ {formatEtaMinutes(etaMinutes)}</span>}
          {distanceKm != null && <span>{formatDistanceKm(distanceKm)}</span>}
        </div>
      )}

      {arrivalSuggested && (
        <div className="mapArrivalBanner" role="status">
          El profesional parece estar cerca (≤ 100 m). Confirma la llegada en el detalle del servicio.
        </div>
      )}

      <div className="mapLiveActions">
        <Link className="secondaryButton" href={`/solicitudes/${requestId}`}>
          <MessageCircle size={16} /> Chat y detalles
        </Link>
        <Link className="secondaryButton" href="/ayuda">
          <LifeBuoy size={16} /> Soporte
        </Link>
        <Link className="dangerButton" href={`/solicitudes/${requestId}`}>
          <XCircle size={16} /> Cancelar / reportar
        </Link>
      </div>

      <p className="fieldHint">
        <AlertTriangle size={12} aria-hidden /> No mostramos teléfono ni WhatsApp hasta la etapa
        definida por las reglas de ZOVIT.
      </p>
    </aside>
  );
}
