import { NextResponse } from "next/server";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { canManageTargetRole, requireIntranetManager } from "@/lib/intranet/apiAuth";
import {
  getIntranetRoleForUser,
  revokeIntranetAccess,
  updateIntranetUserRole,
} from "@/lib/intranet/manageUsers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const body = await request.json();
    const currentRole = await getIntranetRoleForUser(id);
    if (!currentRole) return NextResponse.json({ error: "Acceso interno no encontrado." }, { status: 404 });
    if (!isIntranetRole(body.intranetRole)) {
      return NextResponse.json({ error: "Selecciona un perfil interno válido." }, { status: 400 });
    }
    if (
      !canManageTargetRole(auth.manager.intranetRole, currentRole) ||
      !canManageTargetRole(auth.manager.intranetRole, body.intranetRole)
    ) {
      return NextResponse.json({ error: "No tienes permiso para modificar este acceso." }, { status: 403 });
    }

    await updateIntranetUserRole(id, body.intranetRole);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible actualizar el perfil." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await context.params;
    const currentRole = await getIntranetRoleForUser(id);
    if (!currentRole) return NextResponse.json({ error: "Acceso interno no encontrado." }, { status: 404 });
    if (!canManageTargetRole(auth.manager.intranetRole, currentRole)) {
      return NextResponse.json({ error: "No tienes permiso para revocar este acceso." }, { status: 403 });
    }

    await revokeIntranetAccess(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible revocar el acceso." },
      { status: 500 },
    );
  }
}
