"use client";

import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Pricing = {
  professionalDayNet: number;
  minimumDayNet: number;
  dayHours: number;
  additionalHourNet: number;
  additionalHourSurchargePercent: number;
  fuelBaseFare: number;
  fuelDayKmRate: number;
  fuelNightKmRate: number;
  fuelHighDemandKmRate: number;
  fuelMinuteRate: number;
  fuelNightStartsAt: number;
  fuelNightEndsAt: number;
};

const DEFAULT_PRICING: Pricing = { professionalDayNet: 30000, minimumDayNet: 20000, dayHours: 8, additionalHourNet: 3750, additionalHourSurchargePercent: 50, fuelBaseFare: 4000, fuelDayKmRate: 600, fuelNightKmRate: 800, fuelHighDemandKmRate: 1000, fuelMinuteRate: 100, fuelNightStartsAt: 22, fuelNightEndsAt: 7 };
const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function WorkPricingSettings() {
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const extraHourTotal = useMemo(() => Math.round(pricing.additionalHourNet * (1 + pricing.additionalHourSurchargePercent / 100)), [pricing]);

  useEffect(() => {
    fetch("/api/intranet/work-pricing")
      .then(async (response) => {
        const data = await response.json() as { pricing?: Pricing; error?: string };
        if (!response.ok) throw new Error(data.error);
        setPricing(data.pricing ?? DEFAULT_PRICING);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No fue posible cargar las tarifas."))
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof Pricing, value: number) {
    setPricing((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/intranet/work-pricing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pricing) });
      const data = await response.json() as { pricing?: Pricing; error?: string };
      if (!response.ok) throw new Error(data.error);
      setPricing(data.pricing ?? pricing);
      setMessage("Tarifas guardadas. Se aplicarán a las nuevas cotizaciones automáticas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible guardar las tarifas.");
    } finally { setSaving(false); }
  }

  return <section className="workPricingSettings" aria-busy={loading}>
    <div className="workPricingIntro"><h2>Tarifas automáticas por servicio</h2><p>El cliente no ingresa presupuesto y el profesional no modifica el valor. ZOVIT calcula el cobro desde estos parámetros.</p></div>
    <section className="workPricingGroup" aria-labelledby="work-pricing-title"><h3 id="work-pricing-title">Aseo y limpieza</h3>
    <div className="workPricingGrid">
      <label>Valor diario líquido profesional<input type="number" min={20000} step={1000} value={pricing.professionalDayNet} onChange={(event) => update("professionalDayNet", Number(event.target.value))} /></label>
      <label>Mínimo diario líquido<input type="number" min={20000} step={1000} value={pricing.minimumDayNet} onChange={(event) => update("minimumDayNet", Number(event.target.value))} /></label>
      <label>Horas de jornada diaria<input type="number" min={1} max={24} step={0.5} value={pricing.dayHours} onChange={(event) => update("dayHours", Number(event.target.value))} /></label>
      <label>Valor hora adicional líquido<input type="number" min={0} step={250} value={pricing.additionalHourNet} onChange={(event) => update("additionalHourNet", Number(event.target.value))} /></label>
      <label>Recargo hora adicional (%)<input type="number" min={0} step={1} value={pricing.additionalHourSurchargePercent} onChange={(event) => update("additionalHourSurchargePercent", Number(event.target.value))} /></label>
    </div>
    <div className="workPricingPreview"><span>Profesional recibe por jornada</span><strong>{clp.format(pricing.professionalDayNet)}</strong><span>Hora adicional con recargo configurado</span><strong>{clp.format(extraHourTotal)}</strong></div>
    <p className="fieldHint">El 50% es la referencia mínima de horas extra para trabajo dependiente según el artículo 32 del Código del Trabajo. Para independientes es una regla comercial de ZOVIT y debe validarse con asesoría laboral/tributaria.</p>
    </section>
    <section className="workPricingGroup" aria-labelledby="fuel-pricing-title"><h3 id="fuel-pricing-title">Combustible a domicilio</h3><p>El cálculo usará la ruta profesional → bencinera → cliente. La bencina solicitada se mantiene separada del valor del traslado.</p>
      <div className="workPricingGrid">
        <label>Tarifa mínima del servicio<input type="number" min={0} step={500} value={pricing.fuelBaseFare} onChange={(event) => update("fuelBaseFare", Number(event.target.value))} /></label>
        <label>Valor por km diurno<input type="number" min={0} step={50} value={pricing.fuelDayKmRate} onChange={(event) => update("fuelDayKmRate", Number(event.target.value))} /></label>
        <label>Valor por km nocturno<input type="number" min={0} step={50} value={pricing.fuelNightKmRate} onChange={(event) => update("fuelNightKmRate", Number(event.target.value))} /></label>
        <label>Valor por km alta demanda<input type="number" min={0} step={50} value={pricing.fuelHighDemandKmRate} onChange={(event) => update("fuelHighDemandKmRate", Number(event.target.value))} /></label>
        <label>Valor por minuto de ruta<input type="number" min={0} step={10} value={pricing.fuelMinuteRate} onChange={(event) => update("fuelMinuteRate", Number(event.target.value))} /></label>
        <label>Desde qué hora es nocturno (0–23)<input type="number" min={0} max={23} step={1} value={pricing.fuelNightStartsAt} onChange={(event) => update("fuelNightStartsAt", Number(event.target.value))} /></label>
        <label>Hasta qué hora es nocturno (0–23)<input type="number" min={0} max={23} step={1} value={pricing.fuelNightEndsAt} onChange={(event) => update("fuelNightEndsAt", Number(event.target.value))} /></label>
      </div>
      <p className="fieldHint">La tarifa de alta demanda se aplicará solo cuando la regla de disponibilidad configurada por ZOVIT la active. El precio se mostrará como estimación de ruta y tráfico.</p>
    </section>
    {message && <p className="notice">{message}</p>}
    <button type="button" className="primaryButton" disabled={loading || saving} onClick={() => void save()}><Save size={17} />{saving ? "Guardando…" : "Guardar tarifas"}</button>
  </section>;
}
