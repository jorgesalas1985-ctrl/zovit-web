import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import { FlaskConical, MapPin, ShieldCheck, UserRoundCheck } from "lucide-react";

export default function TestModePage() {
  return <IntranetGuard allowedRoles={["super_admin"]}><IntranetShell title="Modo prueba" kicker="SOLO SUPERADMINISTRADOR" description="Espacio aislado para comprobar el recorrido de una solicitud sin confundirla con la operación real.">
    <section className="testModePanel">
      <div className="testModeWarning"><FlaskConical size={22} /><div><strong>Pruebas controladas</strong><p>Las pruebas deben identificarse como PRUEBA y nunca iniciar cobros Mercado Pago ni alterar contabilidad real.</p></div></div>
      <div className="testModeSteps">
        <article><MapPin size={22}/><h2>1. Crear solicitud</h2><p>Ingresa como Cliente y crea una solicitud de bencina o servicio, usando datos de prueba.</p><Link className="primaryButton" href="/cliente/mapa">Ir al mapa cliente</Link></article>
        <article><UserRoundCheck size={22}/><h2>2. Recibir alerta</h2><p>Cambia a Profesional; la alerta aparecerá con sonido, contador y el valor estimado.</p><Link className="secondaryButton" href="/panel">Ir al panel</Link></article>
        <article><ShieldCheck size={22}/><h2>3. Revisar resultado</h2><p>Verifica la solicitud, los montos y las notificaciones. No confirmes un pago real durante la prueba.</p><Link className="secondaryButton" href="/intranet/finanzas/solicitudes">Ver solicitudes</Link></article>
      </div>
    </section>
  </IntranetShell></IntranetGuard>;
}
