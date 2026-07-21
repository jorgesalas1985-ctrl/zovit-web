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
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  role: "client" | "professional" | "admin";
};

type RequestItem = {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
};

export default function PanelPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function loadPanel() {
      setLoading(true);
      setError("");

      const [profileResult, requestResult, countResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name,last_name,role")
          .eq("id", userId)
          .single(),
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

      if (profileResult.data) {
        setProfile(profileResult.data as Profile);
      }

      if (requestResult.error) {
        setError("No fue posible cargar tus solicitudes. Intenta nuevamente.");
      } else {
        setRequests((requestResult.data ?? []) as RequestItem[]);
      }

      setRequestCount(countResult.count ?? requestResult.data?.length ?? 0);
      setLoading(false);
    }

    void loadPanel();
  }, [user]);

  return (
    <Protected>
      <main className="dashboardPage">
        <section className="dashboardHero">
          <div>
            <p className="kicker light">PANEL PERSONAL</p>
            <h1>
              Hola, {profile?.first_name || user?.email?.split("@")[0] || "usuario"}.
            </h1>
            <p>{profile?.role === "professional" ? "Administra tus trabajos y encuentra nuevas solicitudes." : "Administra tu cuenta y tus solicitudes reales desde un solo lugar."}</p>
          </div>

          {profile?.role === "professional" ? (
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

          <Link href="/solicitudes/nueva" className="dashboardCard">
            <div className="dashboardIcon"><BriefcaseBusiness /></div>
            <div><h3>Solicitar servicio</h3><p>Crea una nueva solicitud.</p></div>
            <ArrowRight />
          </Link>

          <article className="dashboardCard">
            <div className="dashboardIcon"><FileText /></div>
            <div><h3>{requestCount}</h3><p>Solicitudes registradas</p></div>
          </article>
        </section>

        <section className="panelSection">
          <div className="sectionHeading">
            <div><p className="kicker">ACTIVIDAD</p><h2>Mis solicitudes</h2></div>
          </div>

          {loading ? (
            <div className="emptyState">Cargando solicitudes…</div>
          ) : error ? (
            <div className="emptyState"><h3>No pudimos cargar la información</h3><p>{error}</p></div>
          ) : requests.length === 0 ? (
            <div className="emptyState">
              <Clock3 size={34} />
              <h3>Todavía no tienes solicitudes</h3>
              <p>Crea la primera para comenzar a utilizar ZOVIT.</p>
              <Link href="/solicitudes/nueva" className="primaryButton">Crear solicitud</Link>
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
    </Protected>
  );
}
