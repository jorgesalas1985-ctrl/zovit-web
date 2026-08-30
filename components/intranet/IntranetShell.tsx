import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  kicker?: string;
  wide?: boolean;
  headerAction?: ReactNode;
  backHref?: string;
  backLabel?: string;
  showHeader?: boolean;
  children: ReactNode;
};

export function IntranetShell({
  title,
  description,
  kicker = "INTRANET ZOVIT",
  wide = false,
  headerAction,
  backHref: _backHref,
  backLabel = "Atrás",
  showHeader = true,
  children,
}: Props) {
  void _backHref;
  void backLabel;
  return (
    <main className={`simplePage browsePage intranetPage${wide ? " intranetPageWide" : ""}`}>
      <section className="browseShell">
        {showHeader && <div className={`browseHeader${headerAction ? " browseHeaderWithAction" : ""}`}>
          <div className="browseHeaderCopy">
            <p className="kicker">{kicker}</p>
            <h1>{title}</h1>
            {description && <p className="muted browseDescription">{description}</p>}
          </div>
          {headerAction ? <div className="browseHeaderAction">{headerAction}</div> : null}
        </div>}

        {children}
      </section>
    </main>
  );
}
