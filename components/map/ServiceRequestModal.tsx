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

type FuelEstimate = {
  station: { name: string };
  distanceKm: number;
  minutes: number;
  serviceEstimate: number;
  rateMode: "diurna" | "nocturna";
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
  const [fuelRequested, setFuelRequested] = useState(false);
  const [fuelUnit, setFuelUnit] = useState<"pesos" | "litros">("pesos");
  const [fuelValue, setFuelValue] = useState("");
  const [fuelBudget, setFuelBudget] = useState("");
  const [fuelObservation, setFuelObservation] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [withoutVehicle, setWithoutVehicle] = useState(false);
  const [fuelEstimate, setFuelEstimate] = useState<FuelEstimate | null>(null);
  const [fuelEstimateLoading, setFuelEstimateLoading] = useState(false);
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
    setFuelRequested(false);
    setFuelUnit("pesos");
    setFuelValue("");
    setFuelBudget("");
    setFuelObservation("");
    setVehiclePlate("");
    setVehicleType("");
    setVehicleColor("");
    setWithoutVehicle(false);
    setFuelEstimate(null);
    setFuelEstimateLoading(false);
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

  useEffect(() => {
    if (!open || !fuelRequested || !professional) return;
    const controller = new AbortController();
    setFuelEstimate(null);
    setFuelEstimateLoading(true);
    fetch("/api/routing/fuel-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        professional: { latitude: professional.latitude, longitude: professional.longitude },
        client: { latitude: location.latitude, longitude: location.longitude },
      }),
    })
      .then(async (response) => {
        const data = await response.json() as FuelEstimate & { error?: string };
        if (!response.ok) throw new Error(data.error || "No fue posible estimar el traslado.");
        setFuelEstimate(data);
      })
      .catch((estimateError: unknown) => {
        if (controller.signal.aborted) return;
        setError(estimateError instanceof Error ? estimateError.message : "No fue posible estimar el traslado.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setFuelEstimateLoading(false);
      });
    return () => controller.abort();
  }, [fuelRequested, location.latitude, location.longitude, open, professional]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step === "form") {
      if (!fuelRequested && (!description.trim() || description.trim().length < 10)) {
        setError("Describe el problema con al menos 10 caracteres.");
        return;
      }
      if (!location.formattedAddress.trim()) {
        setError("Confirma la dirección del servicio.");
        return;
      }
      if (fuelRequested && (!fuelValue || Number(fuelValue) <= 0)) {
        setError("Indica cuántos litros o cuántos pesos de bencina necesitas.");
        return;
      }
      if (fuelRequested && fuelUnit === "litros" && (!fuelBudget || Number(fuelBudget) <= 0)) {
        setError("Indica el monto máximo en pesos para cubrir la bencina solicitada.");
        return;
      }
      if (fuelRequested && !withoutVehicle && (!vehiclePlate.trim() || !vehicleType.trim() || !vehicleColor.trim())) {
        setError("Indica la patente, tipo y color del vehículo para identificarlo.");
        return;
      }
      if (fuelRequested && (!professional || !fuelEstimate || fuelEstimateLoading)) {
        setError("Espera la estimación automática de ruta antes de continuar.");
        return;
      }
      setError("");
      setStep("confirm");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const requestedFuelBudget = fuelRequested
        ? fuelUnit === "pesos" ? Number(fuelValue) : Number(fuelBudget)
        : null;
      const fuelDetail = fuelRequested
        ? `\n\nBencina solicitada: ${fuelUnit === "pesos" ? `$${Number(fuelValue).toLocaleString("es-CL")}` : `${fuelValue} litros · máximo $${Number(fuelBudget).toLocaleString("es-CL")}`}\n${withoutVehicle ? "Cliente sin vehículo; coordinar entrega." : `Vehículo: ${vehicleType.trim()} · ${vehicleColor.trim()} · Patente ${vehiclePlate.trim().toUpperCase()}`}\nRuta automática: ${fuelEstimate?.distanceKm ?? 0} km · ${fuelEstimate?.minutes ?? 0} min · Bencinera: ${fuelEstimate?.station.name ?? "pendiente"}\nTraslado estimado por ZOVIT: $${Number(fuelEstimate?.serviceEstimate ?? 0).toLocaleString("es-CL")}${fuelObservation.trim() ? `\nObservaciones de entrega: ${fuelObservation.trim()}` : ""}`
        : "";
      const response = await fetch("/api/map/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: professional?.id ?? null,
          category,
          description: fuelRequested ? `Solicitud de bencina a domicilio.${fuelDetail}` : description.trim(),
          address: location.formattedAddress,
          latitude: location.latitude,
          longitude: location.longitude,
          commune: location.commune,
          region: location.region,
          urgency,
          // El cliente no define el valor del trabajo: ZOVIT lo calcula automáticamente.
          // Este campo conserva solo el monto solicitado de bencina cuando corresponde.
          estimatedBudget: requestedFuelBudget,
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
                <section className="fuelRequestBox">
                  <label className="fuelRequestToggle">
                    <input
                      type="checkbox"
                      checked={fuelRequested}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFuelRequested(checked);
                        if (checked) setCategory("Automotriz");
                      }}
                    />
                    Necesito que el profesional lleve bencina
                  </label>
                  {fuelRequested && (
                    <div className="fuelRequestFields">
                      <p className="fieldHint">Solicitud exclusiva de combustible. Indica el monto o los litros que debe llevar el profesional.</p>
                      {fuelEstimateLoading && <p className="fieldHint"><Loader2 className="spinIcon" size={15} /> Calculando ruta, bencinera y valor de traslado…</p>}
                      {fuelEstimate && <div className="fuelRouteEstimate"><strong>Traslado estimado: ${fuelEstimate.serviceEstimate.toLocaleString("es-CL")}</strong><span>{fuelEstimate.distanceKm} km · {fuelEstimate.minutes} min · {fuelEstimate.rateMode} · vía {fuelEstimate.station.name}</span><small>La bencina solicitada se cobra aparte.</small></div>}
                      <div className="intranetFormGrid">
                        <label>
                          Solicitar por
                          <select value={fuelUnit} onChange={(e) => setFuelUnit(e.target.value as typeof fuelUnit)}>
                            <option value="pesos">Monto en pesos</option>
                            <option value="litros">Cantidad de litros</option>
                          </select>
                        </label>
                        {fuelUnit === "litros" && (
                          <label>
                            Monto máximo para bencina (CLP)
                            <input
                              type="number"
                              min={1000}
                              step={1000}
                              value={fuelBudget}
                              onChange={(e) => setFuelBudget(e.target.value)}
                              placeholder="Ej: 20000"
                              required
                            />
                          </label>
                        )}
                        <label>
                          {fuelUnit === "pesos" ? "Bencina solicitada (CLP)" : "Bencina solicitada (litros)"}
                          <input
                            type="number"
                            min={fuelUnit === "pesos" ? 1000 : 1}
                            step={fuelUnit === "pesos" ? 1000 : 0.5}
                            value={fuelValue}
                            onChange={(e) => setFuelValue(e.target.value)}
                            placeholder={fuelUnit === "pesos" ? "Ej: 20000" : "Ej: 10"}
                            required
                          />
                        </label>
                      </div>
                      <label className="fuelRequestToggle">
                        <input type="checkbox" checked={withoutVehicle} onChange={(e) => setWithoutVehicle(e.target.checked)} />
                        Estoy sin vehículo
                      </label>
                      {!withoutVehicle && <fieldset className="fuelVehicleBox">
                        <legend>Identificación del vehículo</legend>
                        <div className="intranetFormGrid">
                          <label>Patente<input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} placeholder="Ej.: AB CD 12" required /></label>
                          <label>Tipo de auto<input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Ej.: Sedán, SUV o camioneta" required /></label>
                          <label>Color<input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="Ej.: Blanco" required /></label>
                        </div>
                      </fieldset>}
                      <label>
                        Observaciones para la entrega (opcional)
                        <textarea
                          rows={3}
                          value={fuelObservation}
                          onChange={(e) => setFuelObservation(e.target.value)}
                          placeholder="Ej.: tipo de combustible, patente, punto de encuentro o indicaciones de acceso."
                        />
                      </label>
                    </div>
                  )}
                </section>
                {!fuelRequested && <>
                  <label>
                    Categoría
                    <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descripción del problema
                    <textarea required minLength={10} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cuéntanos qué necesitas…" />
                  </label>
                </>}
                <label>
                  Dirección confirmada
                  <input type="text" value={location.formattedAddress} readOnly />
                </label>
                {!fuelRequested && <div className="intranetFormGrid">
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
                </div>}
                <p className="fieldHint">
                  El valor del servicio se calcula automáticamente por ZOVIT según la duración,
                  traslado y reglas vigentes. El profesional no puede modificarlo.
                </p>
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
                  {!fuelRequested && <li>Urgencia: {urgency}</li>}
                  {fuelRequested && <li>Bencina solicitada: {fuelUnit === "pesos" ? `$${Number(fuelValue).toLocaleString("es-CL")}` : `${fuelValue} litros · máximo $${Number(fuelBudget).toLocaleString("es-CL")}`}</li>}
                  {fuelRequested && fuelEstimate && <li>Traslado automático: ${fuelEstimate.serviceEstimate.toLocaleString("es-CL")} · {fuelEstimate.distanceKm} km · {fuelEstimate.minutes} min</li>}
                  {fuelRequested && <li>{withoutVehicle ? "Cliente sin vehículo; coordinar entrega." : `Vehículo: ${vehicleType} · ${vehicleColor} · Patente ${vehiclePlate.toUpperCase()}`}</li>}
                  {fuelRequested && fuelObservation.trim() && <li>Observaciones: {fuelObservation.trim()}</li>}
                  {!fuelRequested && <li>{description}</li>}
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
