import { AiSearchForm } from "@/components/ai/AiSearchForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Buscar con IA | ZOVIT",
  description:
    "Describe tu necesidad con tus palabras y ZOVIT IA te recomienda la categoría y profesionales adecuados.",
};

type Props = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

export default async function AiSearchPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";

  if (query.length >= 8) {
    redirect(`/ia/resultados?q=${encodeURIComponent(query)}`);
  }

  return (
    <main className="simplePage browsePage">
      <section className="browseShell">
        <Link href="/" className="browseBackLink">
          <ArrowLeft size={18} /> Volver al inicio
        </Link>

        <div className="browseHeader">
          <p className="kicker">ZOVIT IA</p>
          <h1>Buscar servicio con IA</h1>
          <p className="muted browseDescription">
            Cuéntanos el problema en lenguaje natural. Te sugerimos la especialidad y profesionales
            verificados.
          </p>
        </div>

        <AiSearchForm initialQuery={query} autoFocus />
      </section>
    </main>
  );
}
