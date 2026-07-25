import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Uso de cookies y almacenamiento local en la plataforma ZOVIT.",
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <main className="simplePage">
      <section className="formPageCard">
        <p className="kicker">LEGAL</p>
        <h1>Política de cookies</h1>
        <div className="legalContent">
          <p>
            ZOVIT utiliza cookies y almacenamiento local para mantener tu sesión, recordar preferencias
            como el tema visual y mejorar la experiencia de navegación.
          </p>
          <p>
            Puedes gestionar cookies desde la configuración de tu navegador. Al continuar usando
            ZOVIT, aceptas su uso según esta política.
          </p>
        </div>
        <Link href="/" className="secondaryButton wide">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
