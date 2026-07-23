import { assignableIntranetRoles, isIntranetRole, type IntranetRole } from "@/lib/auth/intranetRoles";
import { createClient } from "@/lib/supabase/server";

export type IntranetManagerContext = {
  userId: string;
  intranetRole: IntranetRole;
};

export async function requireIntranetManager(): Promise<
  { ok: true; manager: IntranetManagerContext } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { ok: false, status: 401, error: "No autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const intranetRole = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;

  if (!intranetRole || !assignableIntranetRoles(intranetRole).length) {
    return { ok: false, status: 403, error: "No tienes permiso para gestionar accesos internos." };
  }

  return {
    ok: true,
    manager: { userId: authData.user.id, intranetRole },
  };
}

export function canManageTargetRole(callerRole: IntranetRole, targetRole: IntranetRole): boolean {
  return assignableIntranetRoles(callerRole).includes(targetRole);
}
