"use client";

import { ExperienceTimeline, ProfessionalHeader, ProfessionalStatsGrid, RatingsList } from "@/components/experience/ExperienceSection";
import type { ProfessionalExperience, ProfessionalStats, PublicProfessionalProfile, ServiceRating } from "@/lib/experience/types";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PublicProfessionalPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfessionalProfile | null>(null);
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [experience, setExperience] = useState<ProfessionalExperience[]>([]);
  const [ratings, setRatings] = useState<ServiceRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError("");

      const [profileResult, statsResult, experienceResult, ratingsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,first_name,last_name,commune,experience_level,public_profile,role,identity_verified")
          .eq("id", id)
          .maybeSingle(),
        supabase.rpc("get_professional_stats", { p_professional_id: id }),
        supabase
          .from("professional_experience")
          .select("id,professional_id,request_id,category,service_summary,completed_at,hours_worked,client_display_name,verified")
          .eq("professional_id", id)
          .order("completed_at", { ascending: false })
          .limit(20),
        supabase
          .from("service_ratings")
          .select("id,request_id,professional_id,rating,comment,created_at")
          .eq("professional_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const profileData = profileResult.data;
      if (profileResult.error || !profileData || profileData.role !== "professional" || profileData.public_profile === false) {
        setError("Este perfil profesional no está disponible.");
        setLoading(false);
        return;
      }

      setProfile({
        id: profileData.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        commune: profileData.commune,
        experience_level: profileData.experience_level ?? "junior",
        public_profile: profileData.public_profile ?? true,
        identity_verified: profileData.identity_verified ?? false,
      });

      const statsRow = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data;
      if (statsRow) {
        setStats({
          completed_jobs: Number(statsRow.completed_jobs ?? 0),
          total_hours: Number(statsRow.total_hours ?? 0),
          average_rating: Number(statsRow.average_rating ?? 0),
          rating_count: Number(statsRow.rating_count ?? 0),
          experience_level: statsRow.experience_level ?? profileData.experience_level ?? "junior",
        });
      }

      setExperience((experienceResult.data ?? []) as ProfessionalExperience[]);
      setRatings((ratingsResult.data ?? []) as ServiceRating[]);
      setLoading(false);
    }

    void load();
  }, [id]);

  if (loading) {
    return <div className="centerState">Cargando perfil profesional…</div>;
  }

  if (error || !profile || !stats) {
    return (
      <main className="simplePage">
        <section className="formPageCard">
          <h1>Perfil no disponible</h1>
          <p className="muted">{error || "No encontramos este profesional."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboardPage">
      <ProfessionalHeader profile={profile} stats={stats} />
      <section className="panelSection">
        <ProfessionalStatsGrid stats={stats} />
      </section>
      <section className="panelSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">EXPERIENCIA VERIFICADA</p>
            <h2>Trabajos respaldados por ZOVIT</h2>
          </div>
        </div>
        <ExperienceTimeline items={experience} />
      </section>
      <section className="panelSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">RESEÑAS</p>
            <h2>Lo que dicen los clientes</h2>
          </div>
        </div>
        <RatingsList items={ratings} />
      </section>
    </main>
  );
}
