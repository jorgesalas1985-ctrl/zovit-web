import type { IntranetRole } from "@/lib/auth/intranetRoles";
import type { ProfileModeFields, UserRole } from "@/lib/auth/roles";

export type EcosystemRole =
  | "student"
  | "company"
  | "institution"
  | "client"
  | "professional"
  | "evaluator"
  | "administrator"
  | "superadmin";

export type EcosystemPermission =
  | "use_client_services"
  | "offer_services"
  | "access_student_passport"
  | "access_company_tools"
  | "access_institution_reports"
  | "review_evaluations"
  | "review_documents"
  | "manage_users"
  | "manage_money"
  | "govern_ai"
  | "govern_ocr"
  | "access_founder_vault"
  | "transfer_ownership";

export type EcosystemProfileInput = Partial<ProfileModeFields> & {
  intranet_role?: IntranetRole | string | null;
  primary_service_profile?: string | null;
  worker_registration_status?: string | null;
  account_kind?: string | null;
};

export const ECOSYSTEM_ROLES: EcosystemRole[] = [
  "student",
  "company",
  "institution",
  "client",
  "professional",
  "evaluator",
  "administrator",
  "superadmin",
];

export const ECOSYSTEM_ROLE_LABELS: Record<EcosystemRole, string> = {
  student: "Alumno",
  company: "Empresa",
  institution: "Institucion",
  client: "Cliente",
  professional: "Profesional",
  evaluator: "Evaluador",
  administrator: "Administrador",
  superadmin: "SUPERADMIN",
};

const ROLE_PERMISSIONS: Record<EcosystemRole, EcosystemPermission[]> = {
  student: ["access_student_passport"],
  company: ["access_company_tools"],
  institution: ["access_institution_reports"],
  client: ["use_client_services"],
  professional: ["offer_services"],
  evaluator: ["review_evaluations", "review_documents"],
  administrator: ["review_documents", "manage_users"],
  superadmin: [
    "use_client_services",
    "offer_services",
    "access_student_passport",
    "access_company_tools",
    "access_institution_reports",
    "review_evaluations",
    "review_documents",
    "manage_users",
    "manage_money",
    "govern_ai",
    "govern_ocr",
    "access_founder_vault",
    "transfer_ownership",
  ],
};

function addRole(roles: Set<EcosystemRole>, role: EcosystemRole) {
  roles.add(role);
}

export function ecosystemRolesFromProfile(profile: EcosystemProfileInput | null | undefined): EcosystemRole[] {
  if (!profile) return [];

  const roles = new Set<EcosystemRole>();
  const publicRole = profile.role as UserRole | undefined;
  const intranetRole = profile.intranet_role;

  if (profile.account_kind === "student" || profile.primary_service_profile === "in_training") {
    addRole(roles, "student");
  }

  if (profile.account_kind === "company") {
    addRole(roles, "company");
  }

  if (profile.account_kind === "institution") {
    addRole(roles, "institution");
  }

  if (publicRole === "client" || profile.can_act_as_client) {
    addRole(roles, "client");
  }

  if (publicRole === "professional" || profile.can_act_as_professional) {
    addRole(roles, "professional");
  }

  if (intranetRole === "supervisor") {
    addRole(roles, "evaluator");
  }

  if (publicRole === "admin" || intranetRole === "hr_admin") {
    addRole(roles, "administrator");
  }

  if (intranetRole === "super_admin") {
    addRole(roles, "superadmin");
  }

  return ECOSYSTEM_ROLES.filter((role) => roles.has(role));
}

export function hasEcosystemRole(
  profile: EcosystemProfileInput | null | undefined,
  role: EcosystemRole,
): boolean {
  return ecosystemRolesFromProfile(profile).includes(role);
}

export function hasEcosystemPermission(
  profile: EcosystemProfileInput | null | undefined,
  permission: EcosystemPermission,
): boolean {
  const roles = ecosystemRolesFromProfile(profile);
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

export function primaryEcosystemHome(role: EcosystemRole): string {
  switch (role) {
    case "student":
      return "/panel/pasaporte";
    case "company":
      return "/empresa";
    case "institution":
      return "/institucion";
    case "client":
      return "/panel";
    case "professional":
      return "/trabajos";
    case "evaluator":
      return "/intranet/supervisor";
    case "administrator":
      return "/intranet/admin";
    case "superadmin":
      return "/intranet/finanzas";
    default:
      return "/panel";
  }
}

export function resolvePrimaryEcosystemRole(
  profile: EcosystemProfileInput | null | undefined,
): EcosystemRole | null {
  const roles = ecosystemRolesFromProfile(profile);
  if (!roles.length) return null;

  const priority: EcosystemRole[] = [
    "superadmin",
    "administrator",
    "evaluator",
    "institution",
    "company",
    "professional",
    "student",
    "client",
  ];

  return priority.find((role) => roles.includes(role)) ?? roles[0] ?? null;
}
