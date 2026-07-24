import {
  INTRANET_LOGIN_PROFILE_LABELS,
  type IntranetRole,
} from "@/lib/auth/intranetRoles";

type IntranetRoleBannerProps = {
  role: IntranetRole;
  variant?: "dashboard" | "page";
};

export function IntranetRoleBanner({ role, variant = "page" }: IntranetRoleBannerProps) {
  const label = INTRANET_LOGIN_PROFILE_LABELS[role].toUpperCase();

  return (
    <div className={`roleModeBanner roleModeBanner--${variant}`} aria-label={`Perfil ${label}`}>
      <span className={`roleModeBadge roleModeBadge--intranet-${role}`}>{label}</span>
    </div>
  );
}
