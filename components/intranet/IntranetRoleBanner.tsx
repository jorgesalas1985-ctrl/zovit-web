import type { IntranetRole } from "@/lib/auth/intranetRoles";
import { PanelProfileHeader } from "@/components/panel/PanelProfileHeader";
import type { SuperAdminTourAccount } from "@/lib/auth/superAdminView";

type IntranetRoleBannerProps = {
  role: IntranetRole;
  variant?: "dashboard" | "page";
};

export function IntranetRoleBanner({ role, variant = "page" }: IntranetRoleBannerProps) {
  void variant;
  const account: SuperAdminTourAccount = role === "hr_admin" ? "admin" : role;
  return <PanelProfileHeader account={account} />;
}
