import { createClient } from "@/lib/supabase/server";
import type { RecommendedProfessional } from "@/lib/ai/types";

type SearchRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  commune: string | null;
  experience_level: "junior" | "verified" | "expert";
  service_categories: string[] | null;
  specialties: string[] | null;
  completed_jobs: number | null;
  average_rating: number | null;
  rating_count: number | null;
  match_score: number | null;
};

type SearchParams = {
  category: string;
  specialty: string;
  commune?: string;
  minRating?: number;
  limit?: number;
};

export async function searchServiceProfessionals({
  category,
  specialty,
  commune,
  minRating = 0,
  limit = 12,
}: SearchParams): Promise<RecommendedProfessional[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_professionals", {
    p_category: category,
    p_specialty: specialty,
    p_commune: commune?.trim() || null,
    p_limit: limit,
  });

  if (error) {
    return [];
  }

  return ((data as SearchRow[] | null) ?? [])
    .map((row) => ({
      id: row.id,
      firstName: row.first_name ?? "Profesional",
      lastName: row.last_name ?? "",
      commune: row.commune,
      experienceLevel: row.experience_level ?? "junior",
      specialties: row.specialties ?? [],
      serviceCategories: row.service_categories ?? [],
      completedJobs: Number(row.completed_jobs ?? 0),
      averageRating: Number(row.average_rating ?? 0),
      ratingCount: Number(row.rating_count ?? 0),
      matchScore: Math.min(100, Math.round((Number(row.match_score ?? 0) / 120) * 100)),
    }))
    .filter((professional) => professional.averageRating >= minRating);
}
