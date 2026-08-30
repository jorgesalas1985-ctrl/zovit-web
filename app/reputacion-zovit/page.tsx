"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { ExperienceBadge, ProfessionalStatsGrid } from "@/components/experience/ExperienceSection";
import { supabase } from "@/lib/supabase";
import type { ProfessionalStats } from "@/lib/experience/types";

function ReputationContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfessionalStats | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    void supabase.rpc("get_professional_stats", { p_professional_id: userId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      setStats({
        completed_jobs: Number(row.completed_jobs ?? 0),
        total_hours: Number(row.total_hours ?? 0),
        average_rating: Number(row.average_rating ?? 0),
        rating_count: Number(row.rating_count ?? 0),
        experience_level: (row.experience_level ?? "junior") as ProfessionalStats["experience_level"],
      });
    });
  }, [user]);

  return <main className="dashboardPage standalonePanelPage"><section className="panelSection">
    <div className="sectionHeading"><div><p className="kicker">REPUTACIÓN ZOVIT</p><h1>Tu progreso verificable</h1>{stats && <ExperienceBadge level={stats.experience_level} />}</div>
      {user && <Link className="secondaryButton" href={`/profesional/${user.id}`}><Share2 size={16} /> Perfil público</Link>}
    </div>
    {stats ? <ProfessionalStatsGrid stats={stats} /> : <div className="emptyState">Cargando reputación…</div>}
  </section></main>;
}

export default function ReputationPage() { return <Protected><ReputationContent /></Protected>; }
