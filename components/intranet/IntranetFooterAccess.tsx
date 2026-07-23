"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

export function IntranetFooterAccess() {
  return (
    <section className="intranetFooterSection intranetFooterSectionCompact">
      <Link href="/intranet/acceso" className="intranetEntryButton">
        <Building2 size={20} />
        Ingreso a intranet
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}
