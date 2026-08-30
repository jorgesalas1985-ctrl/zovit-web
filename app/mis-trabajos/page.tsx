"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Job = { id: string; category: string; status: string; created_at: string };
type Column = "active" | "completed" | "cancelled";
function column(status: string): Column { const value = status.toLowerCase(); return value.includes("cancel") ? "cancelled" : value.includes("final") || value.includes("complet") ? "completed" : "active"; }

function MyJobsContent() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; const userId = user.id; void supabase.from("solicitudes_de_servicio").select("id,category,status,created_at").eq("professional_id", userId).order("created_at", { ascending: false }).then(({ data }) => { setJobs((data ?? []) as Job[]); setLoading(false); }); }, [user]);
  const grouped = { active: jobs.filter((job) => column(job.status) === "active"), completed: jobs.filter((job) => column(job.status) === "completed"), cancelled: jobs.filter((job) => column(job.status) === "cancelled") };
  return <main className="dashboardPage standalonePanelPage"><section className="panelSection"><div className="sectionHeading"><div><p className="kicker">ACTIVIDAD</p><h1>Mis trabajos</h1><p className="muted">Consulta tus trabajos activos, finalizados y cancelados.</p></div></div>
    <div className="clientActivityBoard">{([ ["active", "Asignados / en curso"], ["completed", "Finalizados"], ["cancelled", "Cancelados"] ] as const).map(([key, title]) => <section className="clientActivityColumn" key={key}><div><h3>{title}</h3></div>{loading ? <p className="muted">Cargando…</p> : grouped[key].length === 0 ? <p className="muted">Sin actividades.</p> : grouped[key].map((job) => <Link href={`/solicitudes/${job.id}`} className="clientActivityItem" key={job.id}><span className={`statusPill status-${job.status}`}>{job.status.replaceAll("_", " ")}</span><strong>{job.category}</strong><small>{new Date(job.created_at).toLocaleDateString("es-CL")}</small></Link>)}</section>)}</div>
  </section></main>;
}

export default function MyJobsPage() { return <Protected><MyJobsContent /></Protected>; }
