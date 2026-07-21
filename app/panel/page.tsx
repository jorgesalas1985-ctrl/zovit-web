"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileText,
  Plus,
  UserRound,
} from "lucide-react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { roleErrorMessage } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type RequestItem = {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
};

function PanelContent() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

  const role = profile?.role;
  const isClientView = role === "client" || role === "admin";
  const isProfessionalView = role === "professional";
  const isAdmin = role === "admin";

  useEffect(() => {
    const accessError = searchParams.get("error");
    if (accessError) {
      setAccessMessage(roleErrorMessage(accessError));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !role) return;
    const userId = user.id;

    async function loadPanel() {
      setLoading(true);
      setError("");

      if (isProfessionalView) {
        const { data, error: jobsError } = await supabase
          .from("solicitudes_de_servicio")
          .select("id,category,description,status,created_at")
          .eq("professional_id", userId)
          .order("created_at", { ascending: false })
          .limit(6);

        if (jobsError) {
          setError("No fue posible cargar tus trabajos. Intenta nuevamente.");
        } else {
          setRequests((data ?? []) as RequestItem[]);
          setRequestCount(data?.length ?? 0);
        }

        setLoading(false);
        return;
      }

      const [requestResult, countResult] = await Promise.all([
        supabase
          .from("solicitudes_de_servicio")
          .select("id,category,description,status,created_at")
          .eq("client_id", userId)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("solicitudes_de_servicio")
          .select("id", { count: "exact", head: true })
          .eq("client_id", userId),
      ]);

      if (requestResult.error) {
        setError("No fue posible cargar tus solicitudes. Intenta nuevamente.");
      } else {
        setRequests((requestResult.data ?? []) as RequestItem[]);
      }

      setRequestCount(countResult.count ?? requestResult.data?.length ?? 0);
      setLoading(false);
    }

    void loadPanel();
  }, [user, role, isProfessionalView]);

  return (
    <main className="dashboardPage">
      {accessMessage && <div className="notice">{accessMessage}</div>}

      <section className="dashboardHero">
        <div>
          <p className="kicker light">PANEL PERSONAL</p>
          <h1>
            Hola, {profile?.first_name || user?.email?.split("@")[0] || "usuario"}.
          </h1>
          <p>
            {isProfessionalView
              ? "Administra tus trabajos y encuentra nuevas solicitudes."
              : isAdmin
                ? "Administra solicitudes, trabajos y tu cuenta desde un solo lugar."
                : "Administra tu cuenta y tus solicitudes reales desde un solo lugar."}
          </p>
        </div>

        {isProfessionalView ? (
          <Link className="whiteButton" href="/trabajos"><BriefcaseBusiness size={18} /> Ver trabajos</Link>
        ) : (
          <Link className="whiteButton" href="/solicitudes/nueva"><Plus size={18} /> Nueva solicitud</Link>
        )}
      </section>

      <section className="dashboardGrid">
        <Link href="/perfil" className="dashboardCard">
          <div className="dashboardIcon"><UserRound /></div>
          <div><h3>Mi perfil</h3><p>Actualiza tus datos personales.</p></div>
          <ArrowRight />
        </Link>

        {isClientView && (
          <Link href="/solicitudes/nueva" className="dashboardCard">
            <div className="dashboardIcon"><BriefcaseBusiness /></div>
            <div><h3>Solicitar servicio</h3><p>Crea una nueva solicitud.</p></div>
            <ArrowRight />
          </Link>
        )}

        {(isProfessionalView || isAdmin) && (
          <Link href="/trabajos" className="dashboardCard">
            <div className="dashboardIcon"><BriefcaseBusiness /></div>
            <div><h3>Trabajos</h3><p>Revisa solicitudes disponibles y asignadas.</p></div>
            <ArrowRight />
          </Link>
        )}

        <article className="dashboardCard">
          <div className="dashboardIcon"><FileText /></div>
          <div>
            <h3>{requestCount}</h3>
            <p>{isProfessionalView ? "Trabajos asignados" : "Solicitudes registradas"}</p>
          </div>
        </article>
      </section>

      <section className="panelSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">ACTIVIDAD</p>
            <h2>{isProfessionalView ? "Mis trabajos" : "Mis solicitudes"}</h2>
          </div>
        </div>

        {loading ? (
          <div className="emptyState">Cargando información…</div>
        ) : error ? (
          <div className="emptyState"><h3>No pudimos cargar la información</h3><p>{error}</p></div>
        ) : requests.length === 0 ? (
          <div className="emptyState">
            <Clock3 size={34} />
            <h3>{isProfessionalView ? "Todavía no tienes trabajos asignados" : "Todavía no tienes solicitudes"}</h3>
            <p>
              {isProfessionalView
                ? "Revisa trabajos disponibles y acepta uno para comenzar."
                : "Crea la primera para comenzar a utilizar ZOVIT."}
            </p>
            {isProfessionalView || isAdmin ? (
              <Link href="/trabajos" className="primaryButton">Ver trabajos</Link>
            ) : (
              <Link href="/solicitudes/nueva" className="primaryButton">Crear solicitud</Link>
            )}
          </div>
        ) : (
          <div className="requestList">
            {requests.map((request) => (
              <Link
                href={`/solicitudes/${request.id}`}
                className="requestRow"
                key={request.id}
              >
                <div>
                  <span className={`statusPill status-${request.status}`}>
                    {request.status.replaceAll("_", " ")}
                  </span>
                  <h3>{request.category}</h3>
                  <p>{request.description}</p>
                </div>
                <time>{new Date(request.created_at).toLocaleDateString("es-CL")}</time>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function PanelPage() {
  return (
    <Protected>
      <Suspense fallback={<div className="centerState">Cargando ZOVIT…</div>}>
        <PanelContent />
      </Suspense>
    </Protected>
  );
}
