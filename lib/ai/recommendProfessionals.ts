import { createClient } from "@/lib/supabase/server";
import { parseServiceQuery } from "@/lib/ai/parseQuery";
import type { AiRecommendResponse, RecommendedProfessional } from "@/lib/ai/types";

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
  identity_verified: boolean | null;
  biometric_verified: boolean | null;
};

export async function recommendProfessionals(
  query: string,
  commune?: string,
): Promise<AiRecommendResponse> {
  const parsed = parseServiceQuery(query);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_professionals", {
    p_category: parsed.category,
    p_specialty: parsed.specialty,
    p_commune: commune?.trim() || null,
    p_limit: 6,
  });

  if (error) {
    if (error.message.includes("search_professionals")) {
      return {
        query,
        parsed,
        professionals: [],
        fallbackToRequest: true,
      };
    }
    throw new Error(error.message);
  }

  const professionals: RecommendedProfessional[] = ((data as SearchRow[] | null) ?? []).map(
    (row) => ({
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
      identityVerified: row.identity_verified ?? false,
      biometricVerified: row.biometric_verified ?? false,
    }),
  );

  return {
    query,
    parsed,
    professionals,
    fallbackToRequest: professionals.length === 0,
  };
}
