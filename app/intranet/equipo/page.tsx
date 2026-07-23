import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";

const demoTeam = [
  { name: "María González", role: "Trabajadora", area: "Operaciones" },
  { name: "Carlos Rojas", role: "Trabajador", area: "Soporte" },
  { name: "Ana Pérez", role: "Supervisora", area: "Operaciones" },
];

export default function IntranetTeamPage() {
  return (
    <IntranetGuard allowedRoles={["supervisor", "hr_admin", "super_admin"]}>
      <IntranetShell
        title="Personal ZOVIT"
        description="Vista de antecedentes resumidos. La ficha completa se implementará en la siguiente fase."
      >
        <div className="intranetTableWrap">
          <table className="intranetTable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol interno</th>
                <th>Área</th>
              </tr>
            </thead>
            <tbody>
              {demoTeam.map((person) => (
                <tr key={person.name}>
                  <td>{person.name}</td>
                  <td>{person.role}</td>
                  <td>{person.area}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
