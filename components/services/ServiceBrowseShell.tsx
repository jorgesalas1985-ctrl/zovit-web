import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { RoleMode } from "@/lib/auth/roles";
import type { ReactNode } from "react";
import { RoleModeBanner } from "@/components/RoleModeBanner";

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  kicker?: string;
  breadcrumbs?: ReactNode;
  roleMode?: RoleMode;
  showRoleBanner?: boolean;
  children: ReactNode;
};

export function ServiceBrowseShell({
  title,
  description,
  backHref,
  backLabel = "Volver",
  kicker = "BUSCAR MANUALMENTE",
  breadcrumbs,
  roleMode = "client",
  showRoleBanner = true,
  children,
}: Props) {
  return (
    <>
      {showRoleBanner && <RoleModeBanner role={roleMode} />}
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
    </>
  );
}
