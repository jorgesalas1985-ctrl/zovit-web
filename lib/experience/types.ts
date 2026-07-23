export type ExperienceLevel = "junior" | "verified" | "expert";

export type ProfessionalExperience = {
  id: string;
  professional_id: string;
  request_id: string;
  category: string;
  service_summary: string;
  completed_at: string;
  hours_worked: number;
  client_display_name: string;
  verified: boolean;
};

export type ServiceRating = {
  id: string;
  request_id: string;
  professional_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type ProfessionalStats = {
  completed_jobs: number;
  total_hours: number;
  average_rating: number;
  rating_count: number;
  experience_level: ExperienceLevel;
};

export type PublicProfessionalProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  commune: string | null;
  experience_level: ExperienceLevel;
  public_profile: boolean;
};

export const EXPERIENCE_BADGES: Record<ExperienceLevel, { label: string; description: string }> = {
  junior: {
    label: "Profesional Junior",
    description: "Construyendo experiencia verificable en ZOVIT.",
  },
  verified: {
    label: "Profesional Verificado",
    description: "Historial comprobado de trabajos reales en la plataforma.",
  },
  expert: {
    label: "Profesional Experto",
    description: "Amplia trayectoria verificada con clientes reales.",
  },
};

export function formatHours(hours: number): string {
  if (hours < 1) return "< 1 h";
  if (Number.isInteger(hours)) return `${hours} h`;
  return `${hours.toFixed(1)} h`;
}

export function experienceBadgeClass(level: ExperienceLevel): string {
  return `experienceBadge experienceBadge-${level}`;
}
