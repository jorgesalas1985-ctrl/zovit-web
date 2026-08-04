"use client";

import { FormEvent, useEffect, useState } from "react";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import type { MapProfessional } from "@/lib/map/types";
import type { ClientMapLocation } from "@/lib/geo/geocode";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

type ServiceRequestModalProps = {
  professional: MapProfessional | null;
  location: ClientMapLocation;
  open: boolean;
  onClose: () => void;
  onCreated: (requestId: string) => void;
};

export function ServiceRequestModal({
  professional,
  location,
  open,
  onClose,
  onCreated,
}: ServiceRequestModalProps) {
  const [category, setCategory] = useState(
    professional?.serviceCategories[0] || SERVICE_CATEGORIES[0]
  );
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"low" | "normal" | "high" | "emergency">("normal");
  const [scheduledFor, setScheduledFor] = useState("");
  const [budget, setBudget] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");

  useEffect(() => {
    if (!open) return;
    setCategory(professional?.serviceCategories[0] || SERVICE_CATEGORIES[0]);
    setDescription("");
    setUrgency("normal");
    setScheduledFor("");
    setBudget("");
    setStep("form");
    setBusy(false);
    setError("");
    setCreatedId("");
    // Solo al abrir el modal (no al cambiar el profesional mid-flow).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open edge only
  }, [open]);

  useEffect(() => {
    if (!open || step !== "form") return;
    if (professional?.serviceCategories?.[0]) {
      setCategory(professional.serviceCategories[0]);
    }
  }, [open, step, professional?.serviceCategories]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step === "form") {
      if (!description.trim() || description.trim().length < 10) {
        setError("Describe el problema con al menos 10 caracteres.");
        return;
      }
      if (!location.formattedAddress.trim()) {
        setError("Confirma la dirección del servicio.");
        return;
      }
      setError("");
      setStep("confirm");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/map/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: professional?.id ?? null,
          category,
          description: description.trim(),
          address: location.formattedAddress,
          latitude: location.latitude,
          longitude: location.longitude,
          commune: location.commune,
          region: location.region,
          urgency,
          estimatedBudget: budget ? Number(budget) : null,
          scheduledFor: scheduledFor || null,
        }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.error || "No fue posible crear la solicitud.");
      }
      setCreatedId(data.id);
      setStep("done");
      onCreated(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la solicitud.");
      setStep("form");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mapModalOverlay" role="presentation" onClick={onClose}>
      <div
        className="mapModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-request-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="mapProClose" onClick={onClose} aria-label="Cerrar">
          <X size={16} />
        </button>

        <h2 id="map-request-title">Solicitar servicio</h2>
        {professional && (
          <p className="muted">
            Profesional: <strong>{professional.displayName}</strong>
          </p>
        )}

        {step === "done" ? (
          <div className="mapRequestSuccess">
            <CheckCircle2 size={28} aria-hidden />
            <p>Solicitud publicada correctamente.</p>
            <p className="muted">
              El seguimiento queda activo en el mapa. Te avisaremos cuando un profesional acepte.
            </p>
            <div className="mapModalActions">
              <a className="primaryButton" href={`/solicitudes/${createdId}`}>
                Ver solicitud
              </a>
              <button type="button" className="secondaryButton" onClick={onClose}>
                Seguir en el mapa
              </button>
            </div>
          </div>
        ) : (
          <form className="formStack" onSubmit={submit}>
            {step === "form" ? (
              <>
                <label>
                  Categoría
                  <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Descripción del problema
                  <textarea
                    required
                    minLength={10}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Cuéntanos qué necesitas…"
                  />
                </label>
                <label>
                  Dirección confirmada
                  <input type="text" value={location.formattedAddress} readOnly />
                </label>
                <div className="intranetFormGrid">
                  <label>
                    Urgencia
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                    >
                      <option value="low">Baja</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                      <option value="emergency">Urgente</option>
                    </select>
                  </label>
                  <label>
                    Fecha / horario (opcional)
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Presupuesto estimado CLP (opcional)
                  <input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Ej: 45000"
                  />
                </label>
                <p className="fieldHint">
                  Fotografías: podrás adjuntarlas después en el detalle de la solicitud.
                </p>
              </>
            ) : (
              <div className="mapConfirmBox">
                <p>
                  <strong>Resumen</strong>
                </p>
                <ul>
                  <li>Categoría: {category}</li>
                  {professional && <li>Profesional: {professional.displayName}</li>}
                  <li>Dirección: {location.formattedAddress}</li>
                  <li>Urgencia: {urgency}</li>
                  <li>{description}</li>
                </ul>
              </div>
            )}

            {error && (
              <div className="formMessage" role="alert">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="mapModalActions">
              {step === "confirm" && (
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => setStep("form")}
                  disabled={busy}
                >
                  Volver
                </button>
              )}
              <button type="submit" className="primaryButton" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={16} className="spinIcon" /> Publicando…
                  </>
                ) : step === "form" ? (
                  "Revisar resumen"
                ) : (
                  "Confirmar solicitud"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
