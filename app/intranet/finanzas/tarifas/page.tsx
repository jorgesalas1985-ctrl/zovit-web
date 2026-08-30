import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { WorkPricingSettings } from "@/components/intranet/WorkPricingSettings";

export default function WorkPricingPage() {
  return <IntranetGuard allowedRoles={["super_admin"]}><IntranetShell title="Tarifas automáticas" description="Configura la tarifa base de las nuevas solicitudes y horas adicionales." kicker="FINANZAS · SOLO SUPERADMINISTRADOR"><WorkPricingSettings /></IntranetShell></IntranetGuard>;
}
