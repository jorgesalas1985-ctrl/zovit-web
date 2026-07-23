import { isIntranetRole, type IntranetRole } from "@/lib/auth/intranetRoles";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { requireIntranetManager } from "@/lib/intranet/apiAuth";
import { deletePlatformUser, getPlatformUser, updatePlatformUser } from "@/lib/intranet/platformUsers";
import { NextResponse } from "next/server";

type UpdateBody = {
  firstName?: string;
  lastName?: string;
  rut?: string;
  phone?: string;
  address?: string;
  role?: string;
  intranetRole?: string | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateBody;
    const current = await getPlatformUser(id);

    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (current.intranetRole === "super_admin" && id !== auth.manager.userId) {
      return NextResponse.json({ error: "No puedes modificar al super administrador." }, { status: 403 });
    }

    if (body.role && !USER_ROLES.includes(body.role as UserRole)) {
      return NextResponse.json({ error: "Rol de plataforma inválido." }, { status: 400 });
    }

    if (body.intranetRole !== undefined && body.intranetRole !== null && !isIntranetRole(body.intranetRole)) {
      return NextResponse.json({ error: "Perfil intranet inválido." }, { status: 400 });
    }

    if (body.intranetRole === "super_admin" && auth.manager.intranetRole !== "super_admin") {
      return NextResponse.json({ error: "No puedes asignar super administrador." }, { status: 403 });
    }

    await updatePlatformUser(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      rut: body.rut,
      phone: body.phone,
      address: body.address,
      role: body.role as UserRole | undefined,
      intranetRole:
        body.intranetRole === undefined
          ? undefined
          : body.intranetRole === null
            ? null
            : (body.intranetRole as IntranetRole),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    if (id === auth.manager.userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
    }

    await deletePlatformUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    const status = message.includes("super administrador") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
