import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import {
  BriefcaseBusiness,
  FileText,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

export default function IntranetAdminPage() {
  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        title="Administración RR.HH."
        description="Solo recursos humanos: personal, verificación y credenciales internas. Sin acceso a dineros ni estados de cuenta."
        kicker="RECURSOS HUMANOS"
      >
        <div className="intranetGrid">
          <Link href="/intranet/equipo" className="intranetCard">
            <Users size={24} />
            <h3>Trabajadores ZOVIT</h3>
            <p>Consultar antecedentes personales de todo el personal.</p>
          </Link>
          <Link href="/intranet/admin/verificacion" className="intranetCard">
            <ShieldCheck size={24} />
            <h3>Verificación de identidad</h3>
            <p>Revisar cédula, selfie y prueba de vida de clientes y profesionales.</p>
          </Link>
          <Link href="/intranet/admin/trabajadores" className="intranetCard">
            <BriefcaseBusiness size={24} />
            <h3>Perfiles de servicio</h3>
            <p>Revisar antecedentes, asignar perfiles y autorizar servicios de trabajadores.</p>
          </Link>
          <Link href="/intranet/admin/usuarios" className="intranetCard">
            <UserPlus size={24} />
            <h3>Credenciales intranet</h3>
            <p>Crear accesos internos de trabajadores y supervisores (no finanzas).</p>
          </Link>
          <article className="intranetCard intranetCardStatic">
            <FileText size={24} />
            <h3>Sin acceso a dineros</h3>
            <p>
              Estados de cuenta, wallets y todas las cuentas de la plataforma solo los ve el
              super administrador.
            </p>
          </article>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
