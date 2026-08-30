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
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="mapPermissionNotice" role="status">
      <p>{message}</p>
      <div className="mapPermissionActions">
        <a
          className="primaryButton"
          href="ms-settings:privacy-location"
          aria-label="Abrir configuración de ubicación de Windows"
        >
          Abrir ubicación de Windows
        </a>
        {onDismiss && (
          <button type="button" className="secondaryButton" onClick={onDismiss}>
            Continuar con dirección
          </button>
        )}
      </div>
    </div>
  );
}
