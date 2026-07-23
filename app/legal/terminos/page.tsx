import Link from "next/link";
import type { ReactNode } from "react";

function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="simplePage">
      <section className="formPageCard">
        <p className="kicker">LEGAL</p>
        <h1>{title}</h1>
        <div className="legalContent">{children}</div>
        <Link href="/" className="secondaryButton wide">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        ZOVIT conecta clientes con profesionales verificados. Al usar la plataforma aceptas publicar
        información veraz, respetar a otros usuarios y cumplir la normativa vigente en Chile.
      </p>
      <p>
        Los pagos, garantías y responsabilidades de cada servicio se rigen por lo acordado entre las
        partes dentro de ZOVIT.
      </p>
    </LegalPage>
  );
}
