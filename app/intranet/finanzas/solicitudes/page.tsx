import { PendingServiceRequests } from "@/components/intranet/PendingServiceRequests";
import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";

export default function PendingRequestsPage() {
  return <IntranetGuard allowedRoles={["super_admin"]}><IntranetShell title="Solicitudes pendientes" description="Revisa y administra solicitudes activas de la plataforma." kicker="FINANZAS · SUPERADMINISTRADOR"><PendingServiceRequests /></IntranetShell></IntranetGuard>;
}
