"use client";

import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { ExperienceBadge, ExperienceTimeline, ProfessionalStatsGrid, RatingsList } from "@/components/experience/ExperienceSection";
import { useAuth } from "@/components/AuthProvider";
import type { ProfessionalExperience, ProfessionalStats, ServiceRating } from "@/lib/experience/types";
import { EXPERIENCE_BADGES } from "@/lib/experience/types";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function ExperiencePage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [experience, setExperience] = useState<ProfessionalExperience[]>([]);
  const [ratings, setRatings] = useState<ServiceRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function load() {
      setLoading(true);
      const [statsResult, experienceResult, ratingsResult] = await Promise.all([
        supabase.rpc("get_professional_stats", { p_professional_id: userId }),
        supabase
          .from("professional_experience")
          .select("id,professional_id,request_id,category,service_summary,completed_at,hours_worked,client_display_name,verified")
          .eq("professional_id", userId)
          .order("completed_at", { ascending: false }),
        supabase
          .from("service_ratings")
          .select("id,request_id,professional_id,rating,comment,created_at")
          .eq("professional_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const statsRow = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data;
      if (statsRow) {
        setStats({
          completed_jobs: Number(statsRow.completed_jobs ?? 0),
          total_hours: Number(statsRow.total_hours ?? 0),
          average_rating: Number(statsRow.average_rating ?? 0),
          rating_count: Number(statsRow.rating_count ?? 0),
          experience_level: (statsRow.experience_level ?? "junior") as ProfessionalStats["experience_level"],
        });
      }

      setExperience((experienceResult.data ?? []) as ProfessionalExperience[]);
      setRatings((ratingsResult.data ?? []) as ServiceRating[]);
      setLoading(false);
    }

    void load();
  }, [profile?.role, user]);

  const level = stats?.experience_level ?? "junior";

  return (
    <Protected>
      <RoleGuard allowedRoles={["professional", "admin"]}>
        <main className="dashboardPage">
          <section className="dashboardHero">
            <div>
              <p className="kicker light">CARRERA ZOVIT</p>
              <h1>Tu experiencia verificable</h1>
              <p>Cada trabajo finalizado construye un historial real respaldado por la plataforma.</p>
              <ExperienceBadge level={level} />
              <p className="heroDescription">{EXPERIENCE_BADGES[level].description}</p>
            </div>
            {user && (
              <Link className="whiteButton" href={`/profesional/${user.id}`}>
                <Share2 size={18} /> Ver perfil público
              </Link>
            )}
          </section>

          {loading || !stats ? (
            <div className="emptyState">Cargando tu experiencia…</div>
          ) : (
            <>
              <section className="panelSection">
                <ProfessionalStatsGrid stats={stats} />
              </section>
              <section className="panelSection">
                <div className="sectionHeading">
                  <div>
                    <p className="kicker">HISTORIAL</p>
                    <h2>Trabajos verificados</h2>
                  </div>
                  <Link className="secondaryButton" href="/trabajos">Buscar trabajos <ArrowRight size={16} /></Link>
                </div>
                <ExperienceTimeline items={experience} />
              </section>
              <section className="panelSection">
                <div className="sectionHeading">
                  <div>
                    <p className="kicker">REPUTACIÓN</p>
                    <h2>Calificaciones recibidas</h2>
                  </div>
                </div>
                <RatingsList items={ratings} />
              </section>
            </>
          )}
        </main>
      </RoleGuard>
    </Protected>
  );
}
