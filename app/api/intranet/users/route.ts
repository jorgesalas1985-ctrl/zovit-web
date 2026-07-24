import { isIntranetRole, type IntranetRole } from "@/lib/auth/intranetRoles";
import { validatePasswordForCreate } from "@/lib/auth/passwordPolicy";
import { canManageTargetRole, requireIntranetManager } from "@/lib/intranet/apiAuth";
import { canViewerSeeIntranetAccount } from "@/lib/intranet/accessVisibility";
import { createIntranetUser, listIntranetUsers } from "@/lib/intranet/manageUsers";
import { NextResponse } from "next/server";

type CreateUserBody = {
  email?: string;
  password?: string;
  intranetRole?: string;
  firstName?: string;
  lastName?: string;
};

export async function GET() {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const users = await listIntranetUsers();
    const visibleUsers = users.filter((user) =>
      canViewerSeeIntranetAccount(auth.manager.intranetRole, user.intranetRole)
    );
    return NextResponse.json({ users: visibleUsers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as CreateUserBody;
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const intranetRole = body.intranetRole;

    if (!email || !password || !intranetRole) {
      return NextResponse.json({ error: "Completa correo, contraseña y perfil interno." }, { status: 400 });
    }

    const passwordError = validatePasswordForCreate(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (!isIntranetRole(intranetRole)) {
      return NextResponse.json({ error: "Perfil interno inválido." }, { status: 400 });
    }

    if (!canManageTargetRole(auth.manager.intranetRole, intranetRole)) {
      return NextResponse.json({ error: "No puedes asignar ese perfil interno." }, { status: 403 });
    }

    const user = await createIntranetUser({
      email,
      password,
      intranetRole: intranetRole as IntranetRole,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
