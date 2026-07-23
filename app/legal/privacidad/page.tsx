import Link from "next/link";

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
        </div>
        <Link href="/" className="secondaryButton wide">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
