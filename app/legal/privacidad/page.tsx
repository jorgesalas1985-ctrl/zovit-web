import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo ZOVIT protege y utiliza tus datos personales y de verificación.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="simplePage">
      <section className="formPageCard">
        <p className="kicker">LEGAL</p>
        <h1>Política de privacidad</h1>
        <div className="legalContent">
          <p>
            ZOVIT protege tus datos personales, documentos biométricos y la información asociada a
            tus solicitudes. Solo el equipo autorizado puede revisar verificaciones de identidad.
          </p>
          <p>
            Usamos tus datos para operar la cuenta, validar identidad, gestionar solicitudes y
            mejorar la seguridad de la plataforma.
          </p>
          <p>
            Las medidas técnicas y operativas de protección se detallan en la{" "}
            <Link href="/legal/seguridad">Política de seguridad</Link>.
          </p>
        </div>
        <div className="legalActions">
          <Link href="/legal/seguridad" className="secondaryButton wide">
            Ver política de seguridad
          </Link>
          <Link href="/" className="secondaryButton wide">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
