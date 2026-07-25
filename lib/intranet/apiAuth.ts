import {
  assignableIntranetRoles,
  hasIntranetPermission,
  isIntranetRole,
  type IntranetPermission,
  type IntranetRole,
} from "@/lib/auth/intranetRoles";
import { createClient } from "@/lib/supabase/server";

export type IntranetManagerContext = {
  userId: string;
  intranetRole: IntranetRole;
};

async function loadIntranetRole(userId: string): Promise<IntranetRole | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", userId)
    .maybeSingle();
  return isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
}

export async function requireIntranetManager(): Promise<
  { ok: true; manager: IntranetManagerContext } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { ok: false, status: 401, error: "No autenticado." };
  }

  const intranetRole = await loadIntranetRole(authData.user.id);

  if (!intranetRole || !assignableIntranetRoles(intranetRole).length) {
    return { ok: false, status: 403, error: "No tienes permiso para gestionar accesos internos." };
  }

  return {
    ok: true,
    manager: { userId: authData.user.id, intranetRole },
  };
}

/** Solo super admin: dinero, estados de cuenta y revisión de todas las cuentas. */
export async function requireIntranetSuperAdmin(): Promise<
  { ok: true; manager: IntranetManagerContext } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { ok: false, status: 401, error: "No autenticado." };
  }

  const intranetRole = await loadIntranetRole(authData.user.id);
  if (intranetRole !== "super_admin") {
    return {
      ok: false,
      status: 403,
      error: "Solo el super administrador puede acceder a esta sección.",
    };
  }

  return {
    ok: true,
    manager: { userId: authData.user.id, intranetRole },
  };
}

export async function requireIntranetPermission(permission: IntranetPermission): Promise<
  { ok: true; manager: IntranetManagerContext } | { ok: false; status: number; error: string }
> {
  const auth = await requireIntranetManager();
  if (!auth.ok) return auth;
  if (!hasIntranetPermission(auth.manager.intranetRole, permission)) {
    return { ok: false, status: 403, error: "Permiso insuficiente para esta acción." };
  }
  return auth;
}

export function canManageTargetRole(callerRole: IntranetRole, targetRole: IntranetRole): boolean {
  return assignableIntranetRoles(callerRole).includes(targetRole);
}
