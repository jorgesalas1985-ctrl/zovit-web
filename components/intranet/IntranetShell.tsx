import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  kicker?: string;
  children: ReactNode;
};

export function IntranetShell({ title, description, kicker = "INTRANET ZOVIT", children }: Props) {
  return (
    <main className="simplePage browsePage intranetPage">
      <section className="browseShell">
        <Link href="/" className="browseBackLink">
          <ArrowLeft size={18} /> Volver al sitio público
        </Link>

        <div className="browseHeader">
          <p className="kicker">{kicker}</p>
          <h1>{title}</h1>
          {description && <p className="muted browseDescription">{description}</p>}
        </div>

        {children}
      </section>
    </main>
  );
}
