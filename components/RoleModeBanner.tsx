import type { RoleMode } from "@/lib/auth/roles";

const LABELS: Record<RoleMode, string> = {
  client: "CLIENTE",
  professional: "PROFESIONAL",
};

type RoleModeBannerProps = {
  role: RoleMode;
  variant?: "dashboard" | "page";
};

export function RoleModeBanner({ role, variant = "dashboard" }: RoleModeBannerProps) {
  return (
    <div className={`roleModeBanner roleModeBanner--${variant}`} aria-label={`Modo ${LABELS[role]}`}>
      <span className={`roleModeBadge roleModeBadge--${role}`}>{LABELS[role]}</span>
    </div>
  );
}
