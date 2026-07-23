import type { ServiceCategory } from "@/lib/categories";

export type ParsedServiceNeed = {
  category: ServiceCategory;
  specialty: string;
  confidence: number;
  explanation: string;
  matchedSignals: string[];
};

export type RecommendedProfessional = {
  id: string;
  firstName: string;
  lastName: string;
  commune: string | null;
  experienceLevel: "junior" | "verified" | "expert";
  specialties: string[];
  serviceCategories: string[];
  completedJobs: number;
  averageRating: number;
  ratingCount: number;
  matchScore: number;
};

export type AiRecommendResponse = {
  query: string;
  parsed: ParsedServiceNeed;
  professionals: RecommendedProfessional[];
  fallbackToRequest: boolean;
};
