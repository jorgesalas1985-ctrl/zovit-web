import { AutomationTicker } from "@/components/automation/AutomationTicker";
import { AutomationLastSummary } from "@/components/automation/AutomationLastSummary";
import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  Gauge,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { ProfileSectionMenu } from "@/components/panel/ProfileSectionMenu";

export default function IntranetAdminPage() {
  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        title="Administración RR.HH."
        description="Solo recursos humanos: personal, verificación y credenciales internas. Sin acceso a dineros ni estados de cuenta."
        kicker="RECURSOS HUMANOS"
        backHref="/intranet/finanzas"
        showHeader={false}
      >
        <AutomationTicker />
        <AutomationLastSummary />
        <Link href="/intranet/admin/trabajadores" className="adminReviewAlert">
          <ClipboardCheck size={25} />
          <span>
            <strong>Revisiones de acreditación pendientes</strong>
            <small>Revisar documentos, observaciones y habilitar evaluaciones de conocimientos.</small>
          </span>
          <b>Abrir revisión →</b>
        </Link>
        <ProfileSectionMenu options={[
          { href: "/intranet/admin/centro-control", label: "Centro de Control", description: "Revisa prioridades, suspensiones y automatizaciones." },
          { href: "/intranet/admin/documentos", label: "Revisión documental", description: "Aprueba o rechaza documentos y antecedentes." },
          { href: "/intranet/equipo", label: "Trabajadores ZOVIT", description: "Consulta los antecedentes del personal." },
          { href: "/intranet/admin/verificacion", label: "Verificación de identidad", description: "Revisa cédula, selfie y prueba de vida." },
          { href: "/intranet/admin/trabajadores", label: "Acreditación y evaluaciones", description: "Gestiona documentos, pruebas y activaciones." },
          { href: "/intranet/admin/usuarios", label: "Credenciales intranet", description: "Crea accesos para trabajadores y supervisores." },
        ]} />
        <div className="intranetGrid legacyProfileLinks">
          <Link href="/intranet/admin/centro-control" className="intranetCard">
            <Gauge size={24} />
            <h3>Centro de Control</h3>
            <p>Ver prioridades operativas, revisiones, suspensiones y automatizaciones sensibles.</p>
          </Link>
          <Link href="/intranet/admin/documentos" className="intranetCard">
            <FileText size={24} />
            <h3>Revision documental</h3>
            <p>Aprobar o rechazar documentos semestrales usando datos OCR y eventos auditables.</p>
          </Link>
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
            <h3>Acreditación y evaluaciones</h3>
            <p>Checklist documental, observaciones, pruebas por especialidad y activación.</p>
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
