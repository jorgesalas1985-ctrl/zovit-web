import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  PencilLine,
  Shield,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

export default function IntranetFinancePage() {
  return (
    <IntranetGuard allowedRoles={["super_admin"]}>
      <IntranetShell
        title="Super administración ZOVIT"
        description="Solo tú: dineros, estados de cuenta y revisión de todas las cuentas. RR.HH. no tiene acceso aquí."
        kicker="SUPER ADMIN"
      >
        <div className="intranetGrid">
          <Link href="/admin/pagos" className="intranetCard">
            <CreditCard size={24} />
            <h3>Estados de cuenta y pagos</h3>
            <p>Wallets, retenciones, liberaciones, comisiones y auditoría de dinero.</p>
          </Link>
          <article className="intranetCard intranetCardStatic">
            <Building2 size={24} />
            <h3>Panel financiero</h3>
            <p>Ingresos, costos, márgenes, flujo y KPIs económicos (próximamente).</p>
          </article>
          <Link href="/intranet/admin/gestion-usuarios" className="intranetCard">
            <UserCog size={24} />
            <h3>Todas las cuentas</h3>
            <p>Revisar, modificar, verificar y eliminar cuentas de clientes, profesionales e intranet.</p>
          </Link>
          <Link href="/intranet/admin" className="intranetCard">
            <Users size={24} />
            <h3>RR.HH. y trabajadores</h3>
            <p>Acceso completo a fichas y gestión de personal (también disponible para RR.HH.).</p>
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
            <h3>Separación de poderes</h3>
            <p>Administrador RR.HH. no ve dineros ni el listado completo de cuentas.</p>
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
