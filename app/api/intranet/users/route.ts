import { NextResponse } from "next/server";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { canManageTargetRole, requireIntranetManager } from "@/lib/intranet/apiAuth";
import { createIntranetUser, listIntranetUsers } from "@/lib/intranet/manageUsers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return NextResponse.json(
      { users: await listIntranetUsers() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible cargar los accesos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    if (!isIntranetRole(body.intranetRole)) {
      return NextResponse.json({ error: "Selecciona un perfil interno válido." }, { status: 400 });
    }
    if (!canManageTargetRole(auth.manager.intranetRole, body.intranetRole)) {
      return NextResponse.json({ error: "No tienes permiso para crear ese perfil." }, { status: 403 });
    }

    const user = await createIntranetUser({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      intranetRole: body.intranetRole,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible crear el acceso." },
      { status: 500 },
    );
  }
}
