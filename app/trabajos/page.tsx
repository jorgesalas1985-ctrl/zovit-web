"use client";

import Link from "next/link";
import { BriefcaseBusiness, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { canAccessProfessionalFeatures } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  category: string;
  description: string;
  address: string;
  status: string;
  created_at: string;
  professional_id: string | null;
};

type JobColumn = "published" | "completed" | "cancelled";

function jobColumn(status: string): JobColumn {
  const value = status.toLowerCase();
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("final") || value.includes("complet") || value.includes("termin")) return "completed";
  return "published";
}

export default function JobsPage() {
  const { user, profile } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const canViewJobs = (isRealSuperAdmin && tourAccount === "professional") ||
    (profile ? canAccessProfessionalFeatures(profile) : false);
  const jobsByColumn = {
    published: jobs.filter((job) => jobColumn(job.status) === "published"),
    completed: jobs.filter((job) => jobColumn(job.status) === "completed"),
    cancelled: jobs.filter((job) => jobColumn(job.status) === "cancelled"),
  };

  const loadJobs = useCallback(async () => {
    if (!user || !canViewJobs) return;
    setLoading(true);

    const { data, error } = await supabase.rpc("get_open_jobs_for_professionals");

    if (error) {
      // Fallback si el SQL SPRINT_18 aún no está aplicado: no mostrar calle completa.
      const fallback = await supabase
        .from("solicitudes_de_servicio")
        .select("id,category,description,address,status,created_at,professional_id")
        .or(`status.eq.publicada,professional_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const { maskServiceAddress } = await import("@/lib/location/maskAddress");
      setJobs(
        ((fallback.data ?? []) as Job[]).map((job) => ({
          ...job,
          address: maskServiceAddress(job.address),
        })),
      );
      setMessage(
        fallback.error
          ? "No fue posible cargar los trabajos."
          : "Tablero en modo seguro (dirección aproximada). Aplica SPRINT_18 en Supabase para el RPC definitivo.",
      );
    } else {
      setJobs((data ?? []) as Job[]);
      setMessage("");
    }

    setLoading(false);
  }, [canViewJobs, user]);

  useEffect(() => {
    if (!canViewJobs) {
      setLoading(false);
      return;
    }
    void loadJobs();
  }, [canViewJobs, loadJobs]);

  return (
    <Protected>
        <main className="dashboardPage jobsAvailablePage">
          <section className="jobsAvailableHeader">
            <div>
              <h1>Trabajos disponibles</h1>
              <p>Envía propuestas con precio. El cliente paga protegido en ZOVIT antes de ver la dirección exacta.</p>
            </div>
          </section>
          <section className="jobsAvailableList">
            {message && <div className="notice">{message}</div>}
            {loading ? (
              <div className="emptyState">Cargando trabajos…</div>
            ) : jobs.length === 0 ? (
              <div className="emptyState">
                <BriefcaseBusiness size={36} />
                <h3>No hay trabajos disponibles</h3>
                <p>Vuelve a revisar más tarde.</p>
              </div>
            ) : (
              <div className="jobsStatusBoard">
                {([
                  ["published", "Publicadas"],
                  ["completed", "Finalizadas"],
                  ["cancelled", "Canceladas"],
                ] as const).map(([column, title]) => (
                  <section className="jobsStatusColumn" key={column}>
                    <h2>{title}</h2>
                    {jobsByColumn[column].length === 0 ? (
                      <p className="muted">Sin trabajos.</p>
                    ) : jobsByColumn[column].map((job) => (
                      <article className="jobCard" key={job.id}>
                        <div className="jobCardMain">
                          <span className={`statusPill status-${job.status}`}>
                            {job.status.replaceAll("_", " ")}
                          </span>
                          <h3>{job.category}</h3>
                          <p>{job.description}</p>
                          <small><MapPin size={15} /> {job.address}</small>
                        </div>
                        <div className="jobCardActions">
                          {job.status === "publicada" && !job.professional_id ? (
                            <Link className="primaryButton" href={`/solicitudes/${job.id}`}>
                              Enviar propuesta / cotizar
                            </Link>
                          ) : (
                            <Link className="secondaryButton" href={`/solicitudes/${job.id}`}>
                              Ver detalle
                            </Link>
                          )}
                        </div>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </section>
        </main>
    </Protected>
  );
}
