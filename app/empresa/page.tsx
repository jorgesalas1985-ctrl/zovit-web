"use client";

import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck } from "lucide-react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";

export default function CompanyHomePage() {
  const { profile } = useAuth();

  return (
    <Protected>
      <main className="simplePage">
        <section className="formPageCard">
          <div className="eyebrow">
            <Building2 size={16} /> EMPRESA ZOVIT
          </div>
          <h1>Perfil Empresa</h1>
          <p className="muted">
            Tu perfil empresa prepara oportunidades, solicitudes, busqueda de talento y
            gestion operativa dentro del ecosistema ZOVIT.
          </p>

          <div className="intranetGrid">
            <article className="intranetCard intranetCardStatic">
              <ClipboardCheck size={24} />
              <h3>{profile?.account_kind === "company" ? "Activo" : "Disponible"}</h3>
              <p>Estado inicial del perfil empresa.</p>
            </article>
            <Link href="/solicitudes/nueva" className="intranetCard">
              <ArrowRight size={24} />
              <h3>Crear solicitud</h3>
              <p>Publicar una necesidad de servicio como cuenta representante.</p>
            </Link>
            <Link href="/panel" className="intranetCard">
              <Building2 size={24} />
              <h3>Panel general</h3>
              <p>Volver al panel principal de la cuenta.</p>
            </Link>
          </div>
        </section>
      </main>
    </Protected>
  );
}
