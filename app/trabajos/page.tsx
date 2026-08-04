"use client";

import Link from "next/link";
import { BriefcaseBusiness, MapPin, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { RoleModeBanner } from "@/components/RoleModeBanner";
import { RoleGuard } from "@/components/RoleGuard";
import { ProfessionalAvailabilityToggle } from "@/components/map/ProfessionalAvailabilityToggle";
import { useAuth } from "@/components/AuthProvider";
import { canAccessProfessionalFeatures, getActiveMode } from "@/lib/auth/roles";
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

export default function JobsPage() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const canViewJobs = profile ? canAccessProfessionalFeatures(profile) : false;
  const activeMode = profile ? getActiveMode(profile) : "professional";

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
      <RoleGuard requiredMode="professional" showRoleBanner={false}>
        <main className="dashboardPage">
          <RoleModeBanner role={activeMode} />
          <section className="dashboardHero">
            <div>
              <p className="kicker light">PANEL PROFESIONAL</p>
              <h1>Trabajos disponibles</h1>
              <p>Envía propuestas con precio. El cliente paga protegido en ZOVIT antes de ver la dirección exacta.</p>
            </div>
            <button className="whiteButton" onClick={() => void loadJobs()} disabled={loading}>
              <RefreshCw size={18} /> Actualizar
            </button>
          </section>
          <section className="panelSection compactSection">
            <ProfessionalAvailabilityToggle compact />
          </section>
          <section className="panelSection">
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
              <div className="requestList">
                {jobs.map((job) => (
                  <article className="jobCard" key={job.id}>
                    <div className="jobCardMain">
                      <span className={`statusPill status-${job.status}`}>
                        {job.status.replaceAll("_", " ")}
                      </span>
                      <h3>{job.category}</h3>
                      <p>{job.description}</p>
                      <small>
                        <MapPin size={15} /> {job.address}
                      </small>
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
              </div>
            )}
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}
