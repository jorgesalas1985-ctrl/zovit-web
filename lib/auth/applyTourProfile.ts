import type { RoleMode, UserRole } from "@/lib/auth/roles";
import type { SuperAdminTourAccount } from "@/lib/auth/superAdminView";

export type TourProfileFields = {
  role: UserRole;
  account_kind?: string | null;
  can_act_as_client: boolean;
  can_act_as_professional: boolean;
  active_mode: RoleMode;
  intranet_role?: string | null;
};

type TourOverlay = Pick<
  TourProfileFields,
  "role" | "account_kind" | "can_act_as_client" | "can_act_as_professional" | "active_mode" | "intranet_role"
>;

function overlayForTourAccount(account: SuperAdminTourAccount): TourOverlay | null {
  switch (account) {
    case "student":
      return {
        role: "professional",
        account_kind: "student",
        can_act_as_client: true,
        can_act_as_professional: true,
        active_mode: "client",
        intranet_role: null,
      };
    case "company":
      return {
        role: "client",
        account_kind: "company",
        can_act_as_client: true,
        can_act_as_professional: false,
        active_mode: "client",
        intranet_role: null,
      };
    case "institution":
      return {
        role: "client",
        account_kind: "institution",
        can_act_as_client: true,
        can_act_as_professional: false,
        active_mode: "client",
        intranet_role: null,
      };
    case "client":
      return {
        role: "client",
        account_kind: "client",
        can_act_as_client: true,
        can_act_as_professional: false,
        active_mode: "client",
        intranet_role: null,
      };
    case "professional":
      return {
        role: "professional",
        account_kind: "professional",
        can_act_as_client: true,
        can_act_as_professional: true,
        active_mode: "professional",
        intranet_role: null,
      };
    case "admin":
      return {
        role: "admin",
        account_kind: "client",
        can_act_as_client: true,
        can_act_as_professional: true,
        active_mode: "client",
        intranet_role: "hr_admin",
      };
    case "worker":
      return {
        role: "professional",
        account_kind: "professional",
        can_act_as_client: false,
        can_act_as_professional: true,
        active_mode: "professional",
        intranet_role: "worker",
      };
    case "supervisor":
      return {
        role: "admin",
        account_kind: "professional",
        can_act_as_client: true,
        can_act_as_professional: true,
        active_mode: "professional",
        intranet_role: "supervisor",
      };
    case "super_admin":
      return null;
    default:
      return null;
  }
}

/** Solo el super admin real puede simular otra cuenta. El resto no cambia. */
export function applySuperAdminTourProfile<T extends TourProfileFields>(
  profile: T | null,
  tourAccount: SuperAdminTourAccount | null | undefined,
): T | null {
  if (!profile) return null;
  if (profile.intranet_role !== "super_admin") return profile;
  if (!tourAccount || tourAccount === "super_admin") return profile;

  const overlay = overlayForTourAccount(tourAccount);
  if (!overlay) return profile;

  return {
    ...profile,
    ...overlay,
  };
}

export function readTourAccountFromCookie(
  cookieHeader: string | null | undefined,
): SuperAdminTourAccount | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)zovit-sa-tour=([^;]+)/);
  if (!match?.[1]) return null;
  const value = decodeURIComponent(match[1]);
  const allowed: SuperAdminTourAccount[] = [
    "client",
    "professional",
    "student",
    "company",
    "institution",
    "admin",
    "worker",
    "supervisor",
    "super_admin",
  ];
  return allowed.includes(value as SuperAdminTourAccount)
    ? (value as SuperAdminTourAccount)
    : null;
}
