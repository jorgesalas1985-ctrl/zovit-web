import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import { FileText, PencilLine, ShieldCheck, UserCog, UserPlus, Users, Wallet } from "lucide-react";

export default function IntranetAdminPage() {
  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        title="Administración RR.HH."
        description="Gestión de trabajadores, antecedentes y liquidaciones."
        kicker="RECURSOS HUMANOS"
      >
        <div className="intranetGrid">
          <Link href="/intranet/equipo" className="intranetCard">
            <Users size={24} />
            <h3>Trabajadores ZOVIT</h3>
            <p>Consultar antecedentes personales de todo el personal.</p>
          </Link>
          <Link href="/intranet/liquidaciones" className="intranetCard">
            <PencilLine size={24} />
            <h3>Gestionar liquidaciones</h3>
            <p>Revisar, cargar y modificar liquidaciones de sueldo.</p>
          </Link>
          <Link href="/intranet/admin/gestion-usuarios" className="intranetCard">
            <UserCog size={24} />
            <h3>Gestión de usuarios</h3>
            <p>Ver, modificar, verificar y eliminar cuentas de clientes, profesionales e intranet.</p>
          </Link>
          <Link href="/intranet/admin/verificacion" className="intranetCard">
            <ShieldCheck size={24} />
            <h3>Verificación de identidad</h3>
            <p>Revisar cédula, selfie y prueba de vida de clientes y profesionales.</p>
          </Link>
          <Link href="/intranet/admin/usuarios" className="intranetCard">
            <UserPlus size={24} />
            <h3>Credenciales intranet</h3>
            <p>Crear accesos internos y asignar perfil a trabajadores.</p>
          </Link>
          <article className="intranetCard intranetCardStatic">
            <FileText size={24} />
            <h3>Mis antecedentes</h3>
            <p>Tu ficha como administrador de RR.HH. (próximamente).</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Wallet size={24} />
            <h3>Beneficios corporativos</h3>
            <p>Administración de convenios y beneficios (próximamente).</p>
          </article>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
