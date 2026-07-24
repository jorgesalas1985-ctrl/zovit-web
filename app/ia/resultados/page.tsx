"use client";

import { AiRecommendations } from "@/components/AiRecommendations";
import { useAuth } from "@/components/AuthProvider";
import { RoleModeBanner } from "@/components/RoleModeBanner";
import { canPublishServiceRequest, getActiveMode } from "@/lib/auth/roles";
import type { AiRecommendResponse } from "@/lib/ai/types";
import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AiResultsContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiRecommendResponse | null>(null);

  useEffect(() => {
    if (!query) {
      setError("No hay una consulta para analizar.");
      setLoading(false);
      return;
    }

    if (query.length < 8) {
      setError("La consulta debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setResult(null);

      try {
        const response = await fetch("/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const data = (await response.json()) as AiRecommendResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo analizar tu consulta.");
        }

        if (!cancelled) setResult(data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Error inesperado.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const createRequest = () => {
    if (!query || !result) return;

    if (!user) {
      sessionStorage.setItem(
        "zovit_ai_recommendation",
        JSON.stringify({
          description: query,
          category: result.parsed.category,
          specialty: result.parsed.specialty,
        }),
      );
      router.push(`/login?next=${encodeURIComponent("/solicitudes/nueva")}`);
      return;
    }

    if (profile && !canPublishServiceRequest(profile)) {
      router.push("/trabajos");
      return;
    }

    sessionStorage.setItem(
      "zovit_ai_recommendation",
      JSON.stringify({
        description: query,
        category: result.parsed.category,
        specialty: result.parsed.specialty,
      }),
    );
    router.push("/solicitudes/nueva");
  };

  const canPublish = !profile || canPublishServiceRequest(profile);
  const activeMode = profile ? getActiveMode(profile) : "client";

  return (
    <>
      <RoleModeBanner role={activeMode} />
      <main className="simplePage browsePage">
      <section className="browseShell">
        <Link href="/" className="browseBackLink">
          <ArrowLeft size={18} /> Volver al inicio
        </Link>

        <div className="browseHeader">
          <p className="kicker">ZOVIT IA</p>
          <h1>Análisis de tu necesidad</h1>
          {query && (
            <p className="muted browseDescription">
              Consulta: <strong>&ldquo;{query}&rdquo;</strong>
            </p>
          )}
        </div>

        {loading && (
          <div className="aiResultsLoading">
            <Bot size={28} />
            <p>Analizando tu consulta con ZOVIT IA…</p>
          </div>
        )}

        {!loading && error && (
          <div className="aiEmptyState">
            <p>{error}</p>
            <Link href="/" className="secondaryButton wide">
              Intentar de nuevo
            </Link>
          </div>
        )}

        {!loading && result && (
          <AiRecommendations
            result={result}
            onCreateRequest={createRequest}
            canPublish={canPublish}
          />
        )}
      </section>
    </main>
    </>
  );
}

export default function AiResultsPage() {
  return (
    <Suspense fallback={<div className="centerState">Cargando análisis…</div>}>
      <AiResultsContent />
    </Suspense>
  );
}
