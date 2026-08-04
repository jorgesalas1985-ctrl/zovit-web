import { createAdminClient } from "@/lib/supabase/admin";
import type { ExperienceLevel, ProfessionalExperience, ProfessionalStats } from "@/lib/experience/types";

export type CredentialCvData = {
  experience: ProfessionalExperience[];
  stats: ProfessionalStats | null;
};

export async function loadVerifiedCredentialCv(profileId: string): Promise<CredentialCvData> {
  try {
    const admin = createAdminClient();

    const [experienceResult, statsResult] = await Promise.all([
      admin
        .from("professional_experience")
        .select(
          "id,professional_id,request_id,category,service_summary,completed_at,hours_worked,client_display_name,verified",
        )
        .eq("professional_id", profileId)
        .eq("verified", true)
        .order("completed_at", { ascending: false })
        .limit(40),
      admin.rpc("get_professional_stats", { p_professional_id: profileId }),
    ]);

    const statsRow = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data;
    const stats: ProfessionalStats | null = statsRow
      ? {
          completed_jobs: Number(statsRow.completed_jobs ?? 0),
          total_hours: Number(statsRow.total_hours ?? 0),
          average_rating: Number(statsRow.average_rating ?? 0),
          rating_count: Number(statsRow.rating_count ?? 0),
          experience_level: (statsRow.experience_level ?? "junior") as ExperienceLevel,
        }
      : null;

    return {
      experience: (experienceResult.data ?? []) as ProfessionalExperience[],
      stats,
    };
  } catch {
    return { experience: [], stats: null };
  }
}
