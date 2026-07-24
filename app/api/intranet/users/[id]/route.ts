import { isIntranetRole, type IntranetRole } from "@/lib/auth/intranetRoles";
import { canManageTargetRole, requireIntranetManager } from "@/lib/intranet/apiAuth";
import {
  canViewerSeeIntranetAccount,
  hiddenAccountResponse,
} from "@/lib/intranet/accessVisibility";
import {
  getIntranetRoleForUser,
  revokeIntranetAccess,
  updateIntranetUserRole,
} from "@/lib/intranet/manageUsers";
import { NextResponse } from "next/server";

type UpdateUserBody = {
  intranetRole?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateUserBody;
    const intranetRole = body.intranetRole;

    if (!intranetRole || !isIntranetRole(intranetRole)) {
      return NextResponse.json({ error: "Perfil interno inválido." }, { status: 400 });
    }

    const currentRole = await getIntranetRoleForUser(id);
    if (!currentRole) {
      return NextResponse.json({ error: "Usuario intranet no encontrado." }, { status: 404 });
    }

    if (!canViewerSeeIntranetAccount(auth.manager.intranetRole, currentRole)) {
      const hidden = hiddenAccountResponse();
      return NextResponse.json({ error: hidden.error }, { status: hidden.status });
    }

    if (!canManageTargetRole(auth.manager.intranetRole, currentRole)) {
      return NextResponse.json({ error: "No puedes modificar ese usuario." }, { status: 403 });
    }

    if (!canManageTargetRole(auth.manager.intranetRole, intranetRole)) {
      return NextResponse.json({ error: "No puedes asignar ese perfil interno." }, { status: 403 });
    }

    if (id === auth.manager.userId) {
      return NextResponse.json({ error: "No puedes cambiar tu propio perfil desde aquí." }, { status: 400 });
    }

    await updateIntranetUserRole(id, intranetRole as IntranetRole);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    if (id === auth.manager.userId) {
      return NextResponse.json({ error: "No puedes revocar tu propio acceso." }, { status: 400 });
    }

    const currentRole = await getIntranetRoleForUser(id);
    if (!currentRole) {
      return NextResponse.json({ error: "Usuario intranet no encontrado." }, { status: 404 });
    }

    if (!canViewerSeeIntranetAccount(auth.manager.intranetRole, currentRole)) {
      const hidden = hiddenAccountResponse();
      return NextResponse.json({ error: hidden.error }, { status: hidden.status });
    }

    if (!canManageTargetRole(auth.manager.intranetRole, currentRole)) {
      return NextResponse.json({ error: "No puedes revocar ese usuario." }, { status: 403 });
    }

    await revokeIntranetAccess(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
