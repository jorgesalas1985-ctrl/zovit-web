import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import { Building2, PencilLine, UserPlus, Shield, Users, Wallet } from "lucide-react";

export default function IntranetFinancePage() {
  return (
    <IntranetGuard allowedRoles={["super_admin"]}>
      <IntranetShell
        title="Super administración ZOVIT"
        description="Control total de la intranet, RR.HH. y finanzas corporativas."
        kicker="SUPER ADMIN"
      >
        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <Building2 size={24} />
            <h3>Panel financiero</h3>
            <p>Ingresos, costos, márgenes, flujo y KPIs económicos (próximamente).</p>
          </article>
          <Link href="/intranet/admin" className="intranetCard">
            <Users size={24} />
            <h3>RR.HH. y trabajadores</h3>
            <p>Acceso completo a fichas y gestión de personal.</p>
          </Link>
          <Link href="/intranet/liquidaciones" className="intranetCard">
            <PencilLine size={24} />
            <h3>Liquidaciones</h3>
            <p>Ver y modificar todas las liquidaciones de la empresa.</p>
          </Link>
          <Link href="/intranet/admin/usuarios" className="intranetCard">
            <UserPlus size={24} />
            <h3>Credenciales intranet</h3>
            <p>Crear accesos y asignar perfiles internos a todo el personal.</p>
          </Link>
          <article className="intranetCard intranetCardStatic">
            <Shield size={24} />
            <h3>Roles internos</h3>
            <p>Políticas avanzadas de permisos (próximamente).</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Wallet size={24} />
            <h3>Reportes contables</h3>
            <p>Exportaciones y conciliación financiera (próximamente).</p>
          </article>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
