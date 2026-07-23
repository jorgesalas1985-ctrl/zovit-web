"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { useAuth } from "@/components/AuthProvider";
import { hasIntranetPermission, isIntranetRole } from "@/lib/auth/intranetRoles";

const demoPayrolls = [
  { period: "Julio 2026", gross: "$1.850.000", net: "$1.462.300", status: "Pagada" },
  { period: "Junio 2026", gross: "$1.850.000", net: "$1.458.900", status: "Pagada" },
  { period: "Mayo 2026", gross: "$1.800.000", net: "$1.421.100", status: "Pagada" },
];

export default function IntranetPayrollPage() {
  const { profile } = useAuth();
  const role = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  const canEdit = hasIntranetPermission(role, "edit_payroll");

  return (
    <IntranetGuard allowedRoles={["worker", "supervisor", "hr_admin", "super_admin"]}>
      <IntranetShell
        title={canEdit ? "Gestión de liquidaciones" : "Mis liquidaciones"}
        description={
          canEdit
            ? "Módulo RR.HH. para revisar y modificar liquidaciones. Datos demo hasta conectar Supabase."
            : "Consulta tus liquidaciones de sueldo. Datos demo hasta conectar Supabase."
        }
      >
        <div className="intranetTableWrap">
          <table className="intranetTable">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Bruto</th>
                <th>Líquido</th>
                <th>Estado</th>
                {canEdit && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {demoPayrolls.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{row.gross}</td>
                  <td>{row.net}</td>
                  <td>{row.status}</td>
                  {canEdit && (
                    <td>
                      <button type="button" className="linkButton">
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
