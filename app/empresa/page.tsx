"use client";

import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck } from "lucide-react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { PanelProfileHeader } from "@/components/panel/PanelProfileHeader";
import { ProfileSectionMenu } from "@/components/panel/ProfileSectionMenu";

export default function CompanyHomePage() {
  const { profile } = useAuth();

  return (
    <Protected>
      <main className="simplePage profileOverviewPage">
        <PanelProfileHeader
          account="company"
          personName={[profile?.first_name, profile?.last_name].filter(Boolean).join(" ")}
        />
        <section className="formPageCard profileOverviewCard">
          <ProfileSectionMenu options={[
            { href: "/solicitudes/nueva", label: "Crear solicitud", description: "Publica una necesidad de servicio como cuenta empresa." },
            { href: "/panel", label: "Panel general", description: "Revisa la cuenta y sus herramientas principales." },
          ]} />
          <div className="intranetGrid legacyProfileLinks">
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
