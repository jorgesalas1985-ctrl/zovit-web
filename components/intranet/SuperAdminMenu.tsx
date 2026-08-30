"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, FlaskConical, LogIn } from "lucide-react";

const OPTIONS = [
  ["/intranet/finanzas/pagos", "Estados de cuenta y pagos"],
  ["/intranet/finanzas/tarifas", "Tarifas automáticas de trabajos"],
  ["/intranet/finanzas/solicitudes", "Solicitudes pendientes"],
  ["/intranet/admin/gestion-usuarios", "Todas las cuentas"],
  ["/intranet/admin", "RR.HH. y trabajadores"],
  ["/intranet/liquidaciones", "Liquidaciones"],
  ["/intranet/admin/usuarios", "Crear correo corporativo"],
  ["/intranet/superadmin/ia", "ZOVIT IA · acceso privado"],
] as const;

export function SuperAdminMenu() {
  const router = useRouter();
  const [destination, setDestination] = useState(OPTIONS[0][0]);
  return (
    <section className="superAdminDropdown" aria-labelledby="super-admin-menu-title">
      <div className="superAdminDropdownIcon"><ChevronDown size={24} /></div>
      <div className="superAdminDropdownCopy">
        <h2 id="super-admin-menu-title">Selecciona una sección</h2>
        <p className="muted">Elige el área que necesitas administrar.</p>
        <label>
          Sección
          <select value={destination} onChange={(event) => setDestination(event.target.value as typeof destination)}>
            {OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            <option disabled>Panel financiero — próximamente</option>
            <option disabled>Separación de poderes — informativo</option>
            <option disabled>Reportes contables — próximamente</option>
          </select>
        </label>
        <button type="button" className="primaryButton wide" onClick={() => router.push(destination)}>
          <LogIn size={19} /> Ingresar a la sección
        </button>
        <button type="button" className="testModeButton" onClick={() => router.push("/intranet/finanzas/pruebas")}>
          <FlaskConical size={18} /> Modo prueba
        </button>
      </div>
    </section>
  );
}
