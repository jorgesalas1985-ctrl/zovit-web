"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, RotateCcw, Save } from "lucide-react";
import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { useAuth } from "@/components/AuthProvider";
import { hasIntranetPermission, isIntranetRole } from "@/lib/auth/intranetRoles";

type Payroll = {
  employee: string; rut: string; period: string; contract: "indefinite" | "fixed";
  base: number; workedDays: number; overtime: number; bonuses: number; gratification: number;
  taxableOther: number; mobilization: number; meal: number; nonTaxableOther: number;
  afpName: string; afpPensionRate: number; afpCommissionRate: number;
  healthSystem: "fonasa" | "isapre"; healthRate: number; healthExtra: number;
  unemploymentRate: number; apv: number; tax: number; loans: number; otherDiscounts: number;
};

const initial: Payroll = {
  employee: "", rut: "", period: "2026-08", contract: "indefinite", base: 850000,
  workedDays: 30, overtime: 0, bonuses: 0, gratification: 0, taxableOther: 0,
  mobilization: 0, meal: 0, nonTaxableOther: 0, afpName: "AFP seleccionada",
  afpPensionRate: 10, afpCommissionRate: 1.27, healthSystem: "fonasa", healthRate: 7,
  healthExtra: 0, unemploymentRate: .6, apv: 0, tax: 0, loans: 0, otherDiscounts: 0,
};

const money = (value: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(value || 0));
const number = (value: string) => Math.max(0, Number(value) || 0);

function calculate(p: Payroll) {
  const proportionalBase = p.base * Math.min(30, p.workedDays) / 30;
  const taxable = proportionalBase + p.overtime + p.bonuses + p.gratification + p.taxableOther;
  const nonTaxable = p.mobilization + p.meal + p.nonTaxableOther;
  const afpPension = taxable * p.afpPensionRate / 100;
  const afpCommission = taxable * p.afpCommissionRate / 100;
  const health = taxable * p.healthRate / 100 + p.healthExtra;
  const unemployment = taxable * p.unemploymentRate / 100;
  const legal = afpPension + afpCommission + health + unemployment + p.apv + p.tax;
  const other = p.loans + p.otherDiscounts;
  return { proportionalBase, taxable, nonTaxable, afpPension, afpCommission, health, unemployment, legal, other, totalIncome: taxable + nonTaxable, net: taxable + nonTaxable - legal - other };
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return <label>{label}<input type="number" min="0" step="1000" value={value} onChange={(e) => onChange(number(e.target.value))} /></label>;
}

export default function PayrollPage() {
  const { profile } = useAuth();
  const role = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  const canEdit = hasIntranetPermission(role, "edit_payroll");
  const [payroll, setPayroll] = useState<Payroll>(initial);
  const [saved, setSaved] = useState<Payroll[]>([]);
  const [targetNet, setTargetNet] = useState(0);
  const [notice, setNotice] = useState("");
  const result = useMemo(() => calculate(payroll), [payroll]);
  const set = <K extends keyof Payroll>(key: K, value: Payroll[K]) => setPayroll((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("zovit-payrolls") || "[]")); } catch { setSaved([]); }
  }, []);

  function save() {
    const next = [{ ...payroll }, ...saved.filter((p) => !(p.rut === payroll.rut && p.period === payroll.period))];
    setSaved(next); localStorage.setItem("zovit-payrolls", JSON.stringify(next)); setNotice("Liquidación guardada correctamente.");
  }

  function solveTargetNet() {
    if (!targetNet) return;
    let low = 0, high = Math.max(targetNet * 3, 1000000);
    for (let i = 0; i < 60; i += 1) {
      const mid = (low + high) / 2;
      if (calculate({ ...payroll, base: mid }).net < targetNet) low = mid;
      else high = mid;
    }
    set("base", Math.round(high)); setNotice("Sueldo base ajustado para aproximarse al líquido solicitado.");
  }

  return (
    <IntranetGuard allowedRoles={["worker", "supervisor", "hr_admin", "super_admin"]}>
      <IntranetShell wide title="Liquidaciones de sueldo" description="Calcula, desglosa, edita y guarda liquidaciones mensuales." kicker="REMUNERACIONES" backHref={canEdit ? "/intranet/finanzas" : undefined}>
        {!canEdit ? <p className="notice">Tienes acceso de consulta. Solo el superadministrador puede modificar cálculos.</p> : null}
        {notice ? <p className="notice payrollSuccess">{notice}</p> : null}
        <div className="payrollToolbar">
          <label>Líquido deseado<input type="number" value={targetNet || ""} onChange={(e) => setTargetNet(number(e.target.value))} placeholder="Ej: 900000" /></label>
          <button className="secondaryButton" type="button" onClick={solveTargetNet} disabled={!canEdit}><Calculator size={18}/> Ajustar sueldo base</button>
          <button className="secondaryButton" type="button" onClick={() => setPayroll(initial)} disabled={!canEdit}><RotateCcw size={18}/> Nueva</button>
          <button className="primaryButton" type="button" onClick={save} disabled={!canEdit}><Save size={18}/> Guardar</button>
          <button className="secondaryButton" type="button" onClick={() => window.print()}><Download size={18}/> Imprimir / PDF</button>
        </div>

        <div className="payrollLayout">
          <div className="payrollEditor">
            <section className="payrollFormSection"><h2>Trabajador y período</h2><div className="payrollFields">
              <label>Nombre<input value={payroll.employee} disabled={!canEdit} onChange={(e) => set("employee", e.target.value)} /></label>
              <label>RUT<input value={payroll.rut} disabled={!canEdit} onChange={(e) => set("rut", e.target.value)} /></label>
              <label>Período<input type="month" value={payroll.period} disabled={!canEdit} onChange={(e) => set("period", e.target.value)} /></label>
              <label>Contrato<select value={payroll.contract} disabled={!canEdit} onChange={(e) => { const contract = e.target.value as Payroll["contract"]; setPayroll((p) => ({ ...p, contract, unemploymentRate: contract === "indefinite" ? .6 : 0 })); }}><option value="indefinite">Indefinido</option><option value="fixed">Plazo fijo / obra</option></select></label>
            </div></section>
            <section className="payrollFormSection"><h2>Haberes imponibles</h2><div className="payrollFields">
              <MoneyField label="Sueldo base" value={payroll.base} onChange={(v) => set("base",v)}/><label>Días trabajados<input type="number" min="0" max="30" value={payroll.workedDays} onChange={(e)=>set("workedDays",number(e.target.value))}/></label>
              <MoneyField label="Horas extra" value={payroll.overtime} onChange={(v)=>set("overtime",v)}/><MoneyField label="Bonos imponibles" value={payroll.bonuses} onChange={(v)=>set("bonuses",v)}/><MoneyField label="Gratificación" value={payroll.gratification} onChange={(v)=>set("gratification",v)}/><MoneyField label="Otros imponibles" value={payroll.taxableOther} onChange={(v)=>set("taxableOther",v)}/>
            </div></section>
            <section className="payrollFormSection"><h2>Haberes no imponibles</h2><div className="payrollFields"><MoneyField label="Movilización" value={payroll.mobilization} onChange={(v)=>set("mobilization",v)}/><MoneyField label="Colación" value={payroll.meal} onChange={(v)=>set("meal",v)}/><MoneyField label="Otros no imponibles" value={payroll.nonTaxableOther} onChange={(v)=>set("nonTaxableOther",v)}/></div></section>
            <section className="payrollFormSection"><h2>Previsión, salud y descuentos</h2><div className="payrollFields">
              <label>AFP<input value={payroll.afpName} onChange={(e)=>set("afpName",e.target.value)}/></label><MoneyField label="AFP pensión (%)" value={payroll.afpPensionRate} onChange={(v)=>set("afpPensionRate",v)}/><MoneyField label="Comisión AFP (%)" value={payroll.afpCommissionRate} onChange={(v)=>set("afpCommissionRate",v)}/>
              <label>Salud<select value={payroll.healthSystem} onChange={(e)=>set("healthSystem",e.target.value as Payroll["healthSystem"])}><option value="fonasa">Fonasa</option><option value="isapre">Isapre</option></select></label><MoneyField label="Salud (%)" value={payroll.healthRate} onChange={(v)=>set("healthRate",v)}/><MoneyField label="Adicional Isapre" value={payroll.healthExtra} onChange={(v)=>set("healthExtra",v)}/>
              <MoneyField label="AFC trabajador (%)" value={payroll.unemploymentRate} onChange={(v)=>set("unemploymentRate",v)}/><MoneyField label="APV" value={payroll.apv} onChange={(v)=>set("apv",v)}/><MoneyField label="Impuesto único" value={payroll.tax} onChange={(v)=>set("tax",v)}/><MoneyField label="Préstamos / anticipos" value={payroll.loans} onChange={(v)=>set("loans",v)}/><MoneyField label="Otros descuentos" value={payroll.otherDiscounts} onChange={(v)=>set("otherDiscounts",v)}/>
            </div></section>
          </div>

          <aside className="payrollSlip"><div className="payrollSlipHead"><span>ZOVIT</span><small>Liquidación {payroll.period}</small></div><h2>{payroll.employee || "Trabajador"}</h2><p>{payroll.rut || "RUT pendiente"}</p>
            <h3>Haberes</h3><dl><div><dt>Sueldo proporcional</dt><dd>{money(result.proportionalBase)}</dd></div><div><dt>Horas extra y bonos</dt><dd>{money(payroll.overtime+payroll.bonuses)}</dd></div><div><dt>Gratificación y otros</dt><dd>{money(payroll.gratification+payroll.taxableOther)}</dd></div><div><dt>No imponibles</dt><dd>{money(result.nonTaxable)}</dd></div><div className="payrollSubtotal"><dt>Total haberes</dt><dd>{money(result.totalIncome)}</dd></div></dl>
            <h3>Descuentos</h3><dl><div><dt>AFP 10%</dt><dd>-{money(result.afpPension)}</dd></div><div><dt>Comisión {payroll.afpName}</dt><dd>-{money(result.afpCommission)}</dd></div><div><dt>{payroll.healthSystem === "fonasa" ? "Fonasa" : "Isapre"}</dt><dd>-{money(result.health)}</dd></div><div><dt>Seguro de cesantía</dt><dd>-{money(result.unemployment)}</dd></div><div><dt>APV e impuesto</dt><dd>-{money(payroll.apv+payroll.tax)}</dd></div><div><dt>Otros descuentos</dt><dd>-{money(result.other)}</dd></div><div className="payrollSubtotal"><dt>Total descuentos</dt><dd>-{money(result.legal+result.other)}</dd></div></dl>
            <div className="payrollNet"><span>Líquido a pagar</span><strong>{money(result.net)}</strong></div><p className="payrollDisclaimer">Cálculo administrativo editable. Verifica tasas, topes imponibles e impuesto del período antes de emitir.</p>
          </aside>
        </div>
        {saved.length ? <section className="payrollSaved"><h2>Liquidaciones guardadas</h2>{saved.map((item,i)=><button key={`${item.rut}-${item.period}-${i}`} type="button" onClick={()=>setPayroll(item)}><span>{item.employee || "Sin nombre"} · {item.period}</span><strong>{money(calculate(item).net)}</strong></button>)}</section>:null}
      </IntranetShell>
    </IntranetGuard>
  );
}
