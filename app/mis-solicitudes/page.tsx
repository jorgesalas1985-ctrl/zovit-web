"use client";

import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type RequestItem = {
  id: string;
  category: string;
  status: string;
  created_at: string;
};

type ActivityColumn = "published" | "completed" | "cancelled";

function getActivityColumn(status: string): ActivityColumn {
  const value = status.trim().toLowerCase();
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("final") || value.includes("complet") || value.includes("termin")) return "completed";
  return "published";
}

function MyRequestsContent() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function loadRequests() {
      setLoading(true);
      setError("");
      const { data, error: requestError } = await supabase
        .from("solicitudes_de_servicio")
        .select("id,category,status,created_at")
        .eq("client_id", userId)
        .order("created_at", { ascending: false });

      if (requestError) {
        setError("No fue posible cargar tus solicitudes. Intenta nuevamente.");
      } else {
        setRequests((data ?? []) as RequestItem[]);
      }
      setLoading(false);
    }

    void loadRequests();
  }, [user]);

  const activitiesByStatus = {
    published: requests.filter((request) => getActivityColumn(request.status) === "published"),
    completed: requests.filter((request) => getActivityColumn(request.status) === "completed"),
    cancelled: requests.filter((request) => getActivityColumn(request.status) === "cancelled"),
  };

  return (
    <main className="dashboardPage myRequestsPage">
      <section className="panelSection compactSection myRequestsHeader">
        <Link href="/panel" className="secondaryButton">
          <ArrowLeft size={18} /> Volver al panel
        </Link>
        <div>
          <p className="kicker">ACTIVIDAD</p>
          <h1>Mis solicitudes</h1>
          <p className="muted">Consulta tus solicitudes publicadas, finalizadas y canceladas.</p>
        </div>
      </section>

      <section className="panelSection clientPanelMenu myRequestsBoard">
        {error ? (
          <div className="emptyState"><h3>No pudimos cargar la información</h3><p>{error}</p></div>
        ) : !loading && requests.length === 0 ? (
          <div className="emptyState">
            <Clock3 size={34} />
            <h3>Todavía no tienes solicitudes</h3>
            <p>Crea la primera para comenzar a utilizar ZOVIT.</p>
            <Link href="/cliente/mapa?nueva=1" className="primaryButton">Crear solicitud</Link>
          </div>
        ) : (
          <div className="clientActivityBoard">
            {([ 
              ["published", "Publicadas", "Solicitudes en curso o esperando respuesta."],
              ["completed", "Finalizadas", "Servicios terminados y aprobados."],
              ["cancelled", "Canceladas", "Solicitudes canceladas o cerradas."],
            ] as const).map(([key, title, description]) => (
              <section className="clientActivityColumn" key={key}>
                <div><h3>{title}</h3><p>{description}</p></div>
                {loading ? <p className="muted">Cargando…</p> : activitiesByStatus[key].length === 0 ? <p className="muted">Sin actividades.</p> : activitiesByStatus[key].map((request) => (
                  <Link href={`/solicitudes/${request.id}`} className="clientActivityItem" key={request.id}>
                    <span className={`statusPill status-${request.status}`}>{request.status.replaceAll("_", " ")}</span>
                    <strong>{request.category}</strong>
                    <small>{new Date(request.created_at).toLocaleDateString("es-CL")}</small>
                  </Link>
                ))}
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function MyRequestsPage() {
  return <Protected><MyRequestsContent /></Protected>;
}
