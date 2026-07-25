import type { IntranetRole } from "@/lib/auth/intranetRoles";
import { intranetHomeForRole } from "@/lib/auth/intranetRoles";

export const SUPER_ADMIN_VIEW_KEY = "zovit-superadmin-view";

/** Cuentas que el superadmin puede recorrer en modo vista. */
export type SuperAdminTourAccount =
  | "client"
  | "professional"
  | "admin"
  | "worker"
  | "supervisor"
  | "super_admin";

export const SUPER_ADMIN_TOUR_OPTIONS: Array<{
  id: SuperAdminTourAccount;
  label: string;
  href: string;
}> = [
  { id: "client", label: "Cliente", href: "/panel" },
  { id: "professional", label: "Profesional", href: "/panel" },
  { id: "admin", label: "Admin", href: "/intranet/admin" },
  { id: "worker", label: "Trabajador ZOVIT", href: intranetHomeForRole("worker") },
  { id: "supervisor", label: "Supervisor", href: intranetHomeForRole("supervisor") },
  { id: "super_admin", label: "Super administrador", href: intranetHomeForRole("super_admin") },
];

export function isSuperAdminTourAccount(
  value: string | null | undefined
): value is SuperAdminTourAccount {
  return SUPER_ADMIN_TOUR_OPTIONS.some((option) => option.id === value);
}

export function tourAccountToIntranetRole(
  account: SuperAdminTourAccount
): IntranetRole | null {
  if (account === "admin") return "hr_admin";
  if (
    account === "worker" ||
    account === "supervisor" ||
    account === "super_admin"
  ) {
    return account;
  }
  return null;
}

export function readStoredTourAccount(): SuperAdminTourAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(SUPER_ADMIN_VIEW_KEY);
    return isSuperAdminTourAccount(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTourAccount(account: SuperAdminTourAccount | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!account || account === "super_admin") {
      window.sessionStorage.removeItem(SUPER_ADMIN_VIEW_KEY);
      return;
    }
    window.sessionStorage.setItem(SUPER_ADMIN_VIEW_KEY, account);
  } catch {
    // ignore
  }
}
