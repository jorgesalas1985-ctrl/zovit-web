import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  kicker?: string;
  breadcrumbs?: ReactNode;
  children: ReactNode;
};

export function ServiceBrowseShell({
  title,
  description,
  backHref,
  backLabel = "Volver",
  kicker = "BUSCAR MANUALMENTE",
  breadcrumbs,
  children,
}: Props) {
  return (
    <main className="simplePage browsePage">
      <section className="browseShell">
        {backHref && (
          <Link href={backHref} className="browseBackLink">
            <ArrowLeft size={18} /> {backLabel}
          </Link>
        )}

        {breadcrumbs}

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
