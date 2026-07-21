"use client";

import Link from "next/link";
import { BriefcaseBusiness, MapPin, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Job = { id:string; category:string; description:string; address:string; status:string; created_at:string; professional_id:string|null };

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("solicitudes_de_servicio")
      .select("id,category,description,address,status,created_at,professional_id")
      .or(`status.eq.publicada,professional_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setJobs((data ?? []) as Job[]);
    setMessage(error ? "No fue posible cargar los trabajos. Ejecuta primero el SQL de Fase 1 en Supabase." : "");
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  async function accept(jobId: string) {
    if (!user) return;
    setMessage("");
    const { error } = await supabase.rpc("accept_service_request", { request_id: jobId });
    if (error) setMessage(error.message);
    else { setMessage("Trabajo aceptado correctamente."); await loadJobs(); }
  }

  return (
    <Protected>
      <main className="dashboardPage">
        <section className="dashboardHero">
          <div><p className="kicker light">PANEL PROFESIONAL</p><h1>Trabajos disponibles</h1><p>Acepta solicitudes publicadas y administra las asignadas.</p></div>
          <button className="whiteButton" onClick={() => void loadJobs()}><RefreshCw size={18}/> Actualizar</button>
        </section>
        <section className="panelSection">
          {message && <div className="notice">{message}</div>}
          {loading ? <div className="emptyState">Cargando trabajos…</div> : jobs.length === 0 ? (
            <div className="emptyState"><BriefcaseBusiness size={36}/><h3>No hay trabajos disponibles</h3><p>Vuelve a revisar más tarde.</p></div>
          ) : (
            <div className="requestList">
              {jobs.map((job) => (
                <article className="jobCard" key={job.id}>
                  <div className="jobCardMain">
                    <span className={`statusPill status-${job.status}`}>{job.status.replaceAll("_", " ")}</span>
                    <h3>{job.category}</h3>
                    <p>{job.description}</p>
                    <small><MapPin size={15}/> {job.address}</small>
                  </div>
                  <div className="jobCardActions">
                    {job.status === "publicada" && !job.professional_id ? <button className="primaryButton" onClick={() => void accept(job.id)}>Aceptar trabajo</button> : null}
                    <Link className="secondaryButton" href={`/solicitudes/${job.id}`}>Ver detalle</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </Protected>
  );
}
