"use client";

import {
  INTRANET_PORTAL_LABELS,
  type IntranetPortal,
} from "@/lib/auth/intranetRoles";
import { Building2, ChevronDown, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const portalIcons: Record<IntranetPortal, typeof Users> = {
  trabajadores: Users,
  administrador: Shield,
  super_admin: Building2,
};

export function IntranetFooterAccess() {
  const router = useRouter();
  const [portal, setPortal] = useState<IntranetPortal>("trabajadores");

  function goToIntranet(event: FormEvent) {
    event.preventDefault();
    router.push(`/intranet/acceso?portal=${portal}`);
  }

  return (
    <section className="intranetFooterSection">
      <div className="intranetFooterCard">
        <div>
          <p className="kicker">INTRANET ZOVIT</p>
          <h2>Acceso interno de trabajadores</h2>
          <p className="muted">
            Liquidaciones, antecedentes, beneficios y gestión administrativa. Solo personal autorizado.
          </p>
        </div>

        <form className="intranetFooterForm" onSubmit={goToIntranet}>
          <label>
            Selecciona tu perfil interno
            <div className="intranetSelectWrap">
              <select
                value={portal}
                onChange={(event) => setPortal(event.target.value as IntranetPortal)}
              >
                {(Object.keys(INTRANET_PORTAL_LABELS) as IntranetPortal[]).map((key) => (
                  <option key={key} value={key}>
                    {INTRANET_PORTAL_LABELS[key]}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </label>
          <button type="submit" className="primaryButton">
            Ingresar a intranet
          </button>
        </form>

        <p className="intranetFooterNote">
          ¿Primera vez? Contacta a Recursos Humanos para activar tu cuenta interna.
        </p>
      </div>
    </section>
  );
}

export function IntranetNavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} className="secondaryButton">
      {label}
    </Link>
  );
}
