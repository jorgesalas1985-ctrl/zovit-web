import { EXPERIENCE_BADGES, experienceBadgeClass, formatHours, type ExperienceLevel, type ProfessionalExperience, type ProfessionalStats, type PublicProfessionalProfile, type ServiceRating } from "@/lib/experience/types";
import { IdentityBadge } from "@/components/verification/IdentityBadge";
import { Star } from "lucide-react";

export function ExperienceBadge({ level }: { level: ExperienceLevel }) {
  const badge = EXPERIENCE_BADGES[level];
  return (
    <span className={experienceBadgeClass(level)}>
      {badge.label}
    </span>
  );
}

export function ProfessionalStatsGrid({ stats }: { stats: ProfessionalStats }) {
  return (
    <div className="statsGrid">
      <article className="statCard">
        <strong>{stats.completed_jobs}</strong>
        <span>Trabajos verificados</span>
      </article>
      <article className="statCard">
        <strong>{formatHours(Number(stats.total_hours))}</strong>
        <span>Horas acumuladas</span>
      </article>
      <article className="statCard">
        <strong>{stats.rating_count > 0 ? stats.average_rating.toFixed(1) : "—"}</strong>
        <span>Calificación promedio</span>
      </article>
      <article className="statCard">
        <strong>{stats.rating_count}</strong>
        <span>Reseñas recibidas</span>
      </article>
    </div>
  );
}

export function ExperienceTimeline({ items }: { items: ProfessionalExperience[] }) {
  if (items.length === 0) {
    return (
      <div className="emptyState">
        <h3>Sin experiencia verificada aún</h3>
        <p>Los trabajos finalizados aparecerán aquí automáticamente.</p>
      </div>
    );
  }

  return (
    <div className="experienceList">
      {items.map((item) => (
        <article className="experienceCard" key={item.id}>
          <div className="experienceCardHead">
            <span className="verifiedTag">Verificado por ZOVIT</span>
            <time>{new Date(item.completed_at).toLocaleDateString("es-CL")}</time>
          </div>
          <h3>{item.category}</h3>
          <p>{item.service_summary}</p>
          <div className="experienceMeta">
            <span>{formatHours(Number(item.hours_worked))} trabajadas</span>
            <span>{item.client_display_name}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function RatingsList({ items }: { items: ServiceRating[] }) {
  if (items.length === 0) {
    return <p className="muted">Aún no hay reseñas públicas.</p>;
  }

  return (
    <div className="ratingsList">
      {items.map((item) => (
        <article className="ratingCard" key={item.id}>
          <div className="ratingCardStars">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                size={16}
                className={index < item.rating ? "ratingIcon active" : "ratingIcon"}
                fill={index < item.rating ? "currentColor" : "none"}
              />
            ))}
          </div>
          {item.comment && <p>{item.comment}</p>}
          <time>{new Date(item.created_at).toLocaleDateString("es-CL")}</time>
        </article>
      ))}
    </div>
  );
}

export function ProfessionalHeader({ profile, stats }: { profile: PublicProfessionalProfile; stats: ProfessionalStats }) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Profesional ZOVIT";
  return (
    <header className="professionalHero">
      <div>
        <p className="kicker light">PERFIL PROFESIONAL</p>
        <h1>{fullName}</h1>
        {profile.commune && <p className="muted">{profile.commune}</p>}
        <div className="professionalHeroBadges">
          <ExperienceBadge level={stats.experience_level} />
          <IdentityBadge verified={profile.identity_verified} role="professional" />
        </div>
        <p className="heroDescription">{EXPERIENCE_BADGES[stats.experience_level].description}</p>
      </div>
    </header>
  );
}
