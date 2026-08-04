"use client";

import { LocateFixed, Navigation } from "lucide-react";

export function RecenterMapButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="mapFabButton"
      onClick={onClick}
      disabled={disabled}
      aria-label="Recentrar mapa en mi ubicación"
      title="Recentrar"
    >
      <Navigation size={18} />
    </button>
  );
}

export function UseMyLocationButton({
  onClick,
  busy,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className="secondaryButton mapUseLocationBtn"
      onClick={onClick}
      disabled={busy}
      aria-label="Usar mi ubicación actual"
    >
      <LocateFixed size={16} aria-hidden />
      {busy ? "Obteniendo ubicación…" : "Usar mi ubicación"}
    </button>
  );
}

export function LocationPermissionNotice({
  message,
  onUseLocation,
  onDismiss,
}: {
  message: string;
  onUseLocation?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="mapPermissionNotice" role="status">
      <p>{message}</p>
      <div className="mapPermissionActions">
        {onUseLocation && (
          <button type="button" className="primaryButton" onClick={onUseLocation}>
            Usar mi ubicación
          </button>
        )}
        {onDismiss && (
          <button type="button" className="secondaryButton" onClick={onDismiss}>
            Continuar con dirección
          </button>
        )}
      </div>
    </div>
  );
}
